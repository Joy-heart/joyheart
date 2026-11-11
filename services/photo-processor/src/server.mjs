import { createServer as createHttpServer } from "node:http";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import sharp from "sharp";

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 8192;
const MAX_HEIGHT = 8192;
const MAX_PIXELS = 6_000_000;
const MAX_ACTIVE_NORMALIZATIONS = 2;
const MAX_REPLAY_ENTRIES = 10_000;
const REPLAY_WINDOW_MS = 5 * 60 * 1000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let oversized = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_INPUT_BYTES) {
        oversized = true;
        chunks.length = 0;
      } else if (!oversized) {
        chunks.push(chunk);
      }
    });
    request.on("end", () => {
      if (oversized) {
        reject(Object.assign(new Error("Image exceeds the 5 MB limit."), { statusCode: 413 }));
      } else {
        resolve(Buffer.concat(chunks, size));
      }
    });
    request.on("error", reject);
  });
}

function verifySignature(body, timestampHeader, nonceHeader, signatureHeader, secret, replayCache) {
  if (!timestampHeader || !nonceHeader || !signatureHeader
      || !/^\\d{10,13}$/.test(timestampHeader)
      || !/^[a-f0-9]{32,128}$/i.test(nonceHeader)
      || !/^[a-f0-9]{64}$/i.test(signatureHeader)) return false;

  const timestamp = Number(timestampHeader);
  const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > REPLAY_WINDOW_MS) return false;

  const expected = createHmac("sha256", secret)
    .update(timestampHeader)
    .update(".")
    .update(nonceHeader)
    .update(".")
    .update(body)
    .digest();
  const supplied = Buffer.from(signatureHeader, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

  for (const [nonce, expiresAt] of replayCache) {
    if (expiresAt <= now) replayCache.delete(nonce);
  }
  if (replayCache.has(nonceHeader) || replayCache.size >= MAX_REPLAY_ENTRIES) return false;
  replayCache.set(nonceHeader, now + REPLAY_WINDOW_MS);
  return true;
}

async function normalizePhoto(input) {
  if (input.length < 16 || input.length > MAX_INPUT_BYTES) {
    throw Object.assign(new Error("Image must be between 16 bytes and 5 MB."), { statusCode: 413 });
  }

  const image = sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_PIXELS,
    animated: true,
  });
  const metadata = await image.metadata();

  if (!ALLOWED_FORMATS.has(metadata.format)) {
    throw Object.assign(new Error("Only JPEG, PNG and WebP images are accepted."), { statusCode: 415 });
  }
  if ((metadata.pages ?? 1) !== 1) {
    throw Object.assign(new Error("Animated images are not supported."), { statusCode: 415 });
  }
  if (!metadata.width || !metadata.height
      || metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT
      || metadata.width * metadata.height > MAX_PIXELS) {
    throw Object.assign(new Error("Image dimensions exceed the allowed limit."), { statusCode: 413 });
  }

  const { data, info } = await sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_PIXELS,
    animated: false,
    pages: 1,
  })
    .rotate()
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78, alphaQuality: 90, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  if (!data.length || data.length > MAX_OUTPUT_BYTES) {
    throw Object.assign(new Error("Processed image exceeds the 5 MB output limit."), { statusCode: 413 });
  }

  return {
    data,
    sourceMimeType: metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`,
    width: info.width,
    height: info.height,
    sourceFileSizeBytes: input.length,
    fileSizeBytes: data.length,
    sha256Hex: createHash("sha256").update(data).digest("hex"),
  };
}

export function createServer({ secret = process.env.PHOTO_PROCESSOR_SHARED_SECRET } = {}) {
  const replayCache = new Map();
  let activeNormalizations = 0;

  return createHttpServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      return json(response, 200, { status: "ok", service: "joyheart-photo-processor" });
    }
    if (request.method !== "POST" || request.url !== "/v1/normalize") {
      return json(response, 404, { error: "Not found." });
    }
    if (!secret || Buffer.byteLength(secret) < 32) {
      return json(response, 503, { error: "Photo processor is not configured." });
    }
    if (request.headers["content-type"] !== "application/octet-stream") {
      return json(response, 415, { error: "Expected application/octet-stream." });
    }

    const declaredLength = Number(request.headers["content-length"] ?? 0);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 16 || declaredLength > MAX_INPUT_BYTES) {
      return json(response, 413, { error: "Image must be between 16 bytes and 5 MB." });
    }

    let input;
    try {
      input = await readBody(request);
    } catch (error) {
      return json(response, error.statusCode ?? 400, {
        error: error.statusCode === 413 ? error.message : "Invalid request body.",
      });
    }
    if (input.length !== declaredLength) {
      return json(response, 400, { error: "Content length does not match the request body." });
    }
    if (!verifySignature(
      input,
      request.headers["x-photo-timestamp"],
      request.headers["x-photo-nonce"],
      request.headers["x-photo-signature"],
      secret,
      replayCache,
    )) {
      return json(response, 401, { error: "Unauthorized or replayed photo-processing request." });
    }
    if (activeNormalizations >= MAX_ACTIVE_NORMALIZATIONS) {
      return json(response, 429, { error: "Photo processor is busy. Please retry shortly." });
    }

    activeNormalizations += 1;
    try {
      const result = await normalizePhoto(input);
      response.writeHead(200, {
        "content-type": "image/webp",
        "content-length": String(result.fileSizeBytes),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-photo-source-mime": result.sourceMimeType,
        "x-photo-width": String(result.width),
        "x-photo-height": String(result.height),
        "x-photo-source-size": String(result.sourceFileSizeBytes),
        "x-photo-output-size": String(result.fileSizeBytes),
        "x-photo-sha256": result.sha256Hex,
      });
      response.end(result.data);
    } catch (error) {
      const status = [413, 415].includes(error.statusCode) ? error.statusCode : 400;
      return json(response, status, {
        error: status === 400 ? "The image is invalid, corrupt, or cannot be decoded." : error.message,
      });
    } finally {
      activeNormalizations -= 1;
    }
  });
}
