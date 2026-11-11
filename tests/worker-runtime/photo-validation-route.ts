import { NextResponse } from "next/server";
import { PHOTO_MAX_BYTES, PhotoValidationError, validateAndNormalizePhoto } from "@/app/lib/photos/image-validation";

export const dynamic = "force-dynamic";

// Fixed 2x2 JPEG fixture. Avoid importing jSquash's JPEG encoder in the
// test route: production only needs the JPEG decoder, and the encoder's
// Emscripten glue is incompatible with this Vite/Workers dev transform.
const JPEG_FIXTURE_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPkP09fb3+Pn6/9oADAMBAAIRAxEAPwDlKKKK+1PVP//Z";
const WEBP_FIXTURE_BASE64 = "UklGRjwAAABXRUJQVlA4IDAAAAAQAgCdASoCAAIAAQAcJaACdLoB+AH4AAPIAP7i4L/20MU+IP2Tf/vvhlvdv/MUAAA=";
function syntheticJpeg() {
  const binary = atob(JPEG_FIXTURE_BASE64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}
function syntheticWebp() {
  const binary = atob(WEBP_FIXTURE_BASE64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}
export const runtime = "nodejs";

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Uint8Array) {
  const typeBytes = new TextEncoder().encode(type);
  const output = new Uint8Array(12 + data.length);
  const view = new DataView(output.buffer);
  view.setUint32(0, data.length, false);
  output.set(typeBytes, 4);
  output.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes);
  crcInput.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcInput), false);
  return output;
}
async function syntheticPng(pixels: Uint8Array) {
  const raw = new Uint8Array(18);
  raw.set([0, ...pixels.subarray(0, 8), 0, ...pixels.subarray(8, 16)]);
  const stream = new CompressionStream("deflate");
  const writer = stream.writable.getWriter();
  await writer.write(raw);
  await writer.close();
  const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer());
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 2, false);
  view.setUint32(4, 2, false);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const parts = [
    new Uint8Array([137,80,78,71,13,10,26,10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array()),
  ];
  const result = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result.buffer;
}
function oversizedPngHeader(width: number, height: number) {
  const bytes = new Uint8Array(45);
  const view = new DataView(bytes.buffer);
  bytes.set([137,80,78,71,13,10,26,10], 0);
  view.setUint32(8, 13, false);
  bytes.set([73,72,68,82], 12);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  bytes.set([8,6,0,0,0], 24);
  view.setUint32(29, 0, false);
  view.setUint32(33, 0, false);
  bytes.set([73,69,78,68], 37);
  view.setUint32(41, 0, false);
  return bytes.buffer;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  try {
    const pixels = new Uint8ClampedArray([
      240,40,60,255, 20,160,100,255, 40,80,220,255, 245,210,30,255,
    ]);
    const fixtures = await Promise.all([
      Promise.resolve(syntheticJpeg()),
      syntheticPng(new Uint8Array(pixels)),
      Promise.resolve(syntheticWebp()),
    ]);
    const results = [];
    for (const [mimeType, bytes] of [["image/jpeg", fixtures[0]], ["image/png", fixtures[1]], ["image/webp", fixtures[2]]]) {
      const output = await validateAndNormalizePhoto(bytes, mimeType);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", output.bytes));
      const expectedSha256 = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (output.mimeType !== "image/webp" || output.width !== 2 || output.height !== 2
          || output.fileSizeBytes > PHOTO_MAX_BYTES || !/^[0-9a-f]{64}$/.test(output.sha256Hex)
          || expectedSha256 !== output.sha256Hex) {
        throw new Error(mimeType + " normalization result or SHA-256 digest is invalid");
      }
      results.push({
        sourceMimeType: output.sourceMimeType, outputMimeType: output.mimeType,
        width: output.width, height: output.height, sourceBytes: output.sourceFileSizeBytes,
        outputBytes: output.fileSizeBytes, sha256Valid: true,
      });
    }
    const png = new Uint8Array(fixtures[1]);
    const jpeg = new Uint8Array(fixtures[0]);
    const webp = new Uint8Array(fixtures[2]);

    // Inject a synthetic EXIF APP1 segment; re-encoding must strip it.
    const exifSegment = new Uint8Array([255,225,0,12,69,120,105,102,0,0,1,2,3,4]);
    const jpegWithExif = new Uint8Array(jpeg.length + exifSegment.length);
    jpegWithExif.set(jpeg.subarray(0, 2), 0);
    jpegWithExif.set(exifSegment, 2);
    jpegWithExif.set(jpeg.subarray(2), 2 + exifSegment.length);
    const stripped = await validateAndNormalizePhoto(jpegWithExif.buffer, "image/jpeg");
    const metadataStripped = !new TextDecoder().decode(new Uint8Array(stripped.bytes)).includes("Exif");
    if (!metadataStripped) throw new Error("EXIF metadata survived image normalization");

    const corruptPng = new Uint8Array(png);
    corruptPng[50] ^= 0xff;
    const apngChunk = pngChunk("acTL", new Uint8Array([0,0,0,1,0,0,0,0]));
    const animatedPng = new Uint8Array(png.length + apngChunk.length);
    animatedPng.set(png.subarray(0, 33), 0);
    animatedPng.set(apngChunk, 33);
    animatedPng.set(png.subarray(33), 33 + apngChunk.length);

    const animatedWebp = new Uint8Array(30);
    const animatedWebpView = new DataView(animatedWebp.buffer);
    animatedWebp.set([82,73,70,70], 0);
    animatedWebpView.setUint32(4, 22, true);
    animatedWebp.set([87,69,66,80,86,80,56,88], 8);
    animatedWebpView.setUint32(16, 10, true);
    animatedWebp[20] = 0x02;

    const expectRejected = async (bytes: ArrayBuffer, mime: string, label: string) => {
      const rejected = await validateAndNormalizePhoto(bytes, mime).then(() => false, () => true);
      if (!rejected) throw new Error(label + " was not rejected");
      return label;
    };
    const rejectedCases = await Promise.all([
      expectRejected(png.buffer, "image/jpeg", "MIME spoof"),
      expectRejected(png.slice(0, 28).buffer, "image/png", "truncated PNG"),
      expectRejected(corruptPng.buffer, "image/png", "corrupt PNG payload"),
      expectRejected(new Uint8Array(45).fill(0).buffer, "image/gif", "unsupported format"),
      expectRejected(oversizedPngHeader(3000, 3000), "image/png", "pixel-limit PNG"),
      expectRejected(jpeg.slice(0, jpeg.length - 2).buffer, "image/jpeg", "truncated JPEG"),
      expectRejected(webp.slice(0, webp.length - 1).buffer, "image/webp", "truncated WebP"),
      expectRejected(animatedPng.buffer, "image/png", "animated PNG"),
      expectRejected(animatedWebp.buffer, "image/webp", "animated WebP"),
      expectRejected(new ArrayBuffer(PHOTO_MAX_BYTES + 1), "image/png", "5 MB byte limit"),
    ]);
    return NextResponse.json({
      success: true, runtime: "Cloudflare Workers local runtime",
      results, rejectedCases, metadataStripped,
    });
  } catch (error) {
    const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
    const causeRecord = cause && typeof cause === "object"
      ? cause as { name?: unknown; message?: unknown }
      : undefined;
    const evidence = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown decoder error",
      stage: error instanceof PhotoValidationError ? error.stage : "test_route",
      causeType: cause === null ? "null" : typeof cause,
      causeName: typeof causeRecord?.name === "string" ? causeRecord.name : null,
      causeMessage: typeof causeRecord?.message === "string" ? causeRecord.message.slice(0, 300) : String(cause ?? "").slice(0, 300) || null,
    };
    console.error("[joyheart-photo-worker-test]", evidence);
    return NextResponse.json(evidence, { status: 500 });
  }
}
