import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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
  const signature = createHmac("sha256", SECRET).update(timestamp).update(".").update(bytes).digest("hex");
  return {
    "content-type": "application/octet-stream",
    "content-length": String(bytes.length),
    "x-photo-timestamp": timestamp,
    "x-photo-signature": signature,
  };
}

async function pngFixture() {
  return sharp({ create: { width: 12, height: 8, channels: 3, background: "#c65a75" } }).png().toBuffer();
}

test("health endpoint is available without credentials", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "joyheart-photo-processor" });
  });
});

test("normalizes an authenticated PNG to WebP", async () => {
  await withServer(async (base) => {
    const source = await pngFixture();
    const response = await fetch(`${base}/v1/normalize`, { method: "POST", headers: signedHeaders(source), body: source });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    const output = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 12);
    assert.equal(metadata.height, 8);
    assert.equal(response.headers.get("x-photo-source-mime"), "image/png");
    assert.equal(response.headers.get("x-photo-sha256")?.length, 64);
  });
});

test("rejects requests without a valid HMAC", async () => {
  await withServer(async (base) => {
    const source = await pngFixture();
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
