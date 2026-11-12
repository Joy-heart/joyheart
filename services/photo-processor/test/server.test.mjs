import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import sharp from "sharp";
import { createServer } from "../src/server.mjs";

const SECRET = "test-only-secret-with-at-least-32-bytes";

async function withServer(fn) {
  const server = createServer({ secret: SECRET });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try { await fn(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

function signedHeaders(bytes) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", SECRET)
    .update(timestamp).update(".").update(nonce).update(".").update(bytes).digest("hex");
  return {
    "content-type": "application/octet-stream",
    "content-length": String(bytes.length),
    "x-photo-timestamp": timestamp,
    "x-photo-nonce": nonce,
    "x-photo-signature": signature,
  };
}

async function imageFixture(format) {
  const image = sharp({ create: { width: 12, height: 8, channels: 3, background: "#c65a75" } });
  return image[format]().toBuffer();
}

test("health endpoint is available without credentials", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "joyheart-photo-processor" });
  });
});

test("normalizes authenticated JPEG, PNG and WebP images to WebP", async () => {
  await withServer(async (base) => {
    for (const [format, mime] of [["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"]]) {
      const source = await imageFixture(format);
      const response = await fetch(`${base}/v1/normalize`, { method: "POST", headers: signedHeaders(source), body: source });
      assert.equal(response.status, 200, `expected ${format} to normalize`);
      assert.equal(response.headers.get("content-type"), "image/webp");
      const output = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(output).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, 12);
      assert.equal(metadata.height, 8);
      assert.equal(response.headers.get("x-photo-source-mime"), mime);
      assert.equal(response.headers.get("x-photo-sha256")?.length, 64);
    }
  });
});

test("rejects requests without a valid HMAC", async () => {
  await withServer(async (base) => {
    const source = await imageFixture("png");
    const headers = signedHeaders(source);
    headers["x-photo-signature"] = "0".repeat(64);
    const response = await fetch(`${base}/v1/normalize`, { method: "POST", headers, body: source });
    assert.equal(response.status, 401);
  });
});

test("rejects corrupt image bytes", async () => {
  await withServer(async (base) => {
    const source = Buffer.from("not-a-real-image-file");
    const response = await fetch(`${base}/v1/normalize`, { method: "POST", headers: signedHeaders(source), body: source });
    assert.equal(response.status, 400);
  });
});


test("rejects a replayed signed request", async () => {
  await withServer(async (base) => {
    const source = await imageFixture("png");
    const headers = signedHeaders(source);
    const first = await fetch(`${base}/v1/normalize`, { method: "POST", headers, body: source });
    assert.equal(first.status, 200);
    const replay = await fetch(`${base}/v1/normalize`, { method: "POST", headers, body: source });
    assert.equal(replay.status, 401);
  });
});

test("rejects an expired request signature", async () => {
  await withServer(async (base) => {
    const source = await imageFixture("png");
    const headers = signedHeaders(source);
    const timestamp = String(Math.floor(Date.now() / 1000) - 600);
    headers["x-photo-timestamp"] = timestamp;
    headers["x-photo-signature"] = createHmac("sha256", SECRET)
      .update(timestamp).update(".").update(headers["x-photo-nonce"]).update(".").update(source).digest("hex");
    const response = await fetch(`${base}/v1/normalize`, { method: "POST", headers, body: source });
    assert.equal(response.status, 401);
  });
});

test("rejects oversized bodies with HTTP 413", async () => {
  await withServer(async (base) => {
    const source = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const response = await fetch(`${base}/v1/normalize`, {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: source,
    });
    assert.equal(response.status, 413);
  });
});
