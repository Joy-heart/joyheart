import decodeJpeg, { init as initJpegDecoder } from "@jsquash/jpeg/decode";
import decodePng, { init as initPngDecoder } from "@jsquash/png/decode";
import decodeWebp, { init as initWebpDecoder } from "@jsquash/webp/decode";
import encodeWebp, { init as initWebpEncoder } from "@jsquash/webp/encode";
import { simd } from "wasm-feature-detect";
import jpegDecoderWasm from "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm?module";
import pngDecoderWasm from "@jsquash/png/codec/pkg/squoosh_png_bg.wasm?module";
import webpDecoderWasm from "@jsquash/webp/codec/dec/webp_dec.wasm?module";
import webpEncoderWasm from "@jsquash/webp/codec/enc/webp_enc.wasm?module";
import webpEncoderSimdWasm from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?module";

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_WIDTH = 8192;
export const PHOTO_MAX_HEIGHT = 8192;
export const PHOTO_MAX_PIXELS = 6_000_000;
export type SupportedPhotoMime = "image/jpeg" | "image/png" | "image/webp";
export type ValidatedPhoto = {
  bytes: ArrayBuffer; mimeType: "image/webp"; sourceMimeType: SupportedPhotoMime;
  width: number; height: number; sourceFileSizeBytes: number; fileSizeBytes: number; sha256Hex: string;
};
export type PhotoProcessingStage = "input" | "header" | "jpeg_decoder_init" | "jpeg_decoder_warmup" | "png_decoder_init" | "webp_decoder_init" | "webp_encoder_init" | "decode" | "encode" | "digest";

export class PhotoValidationError extends Error {
  readonly stage: PhotoProcessingStage;
  constructor(message: string, stage: PhotoProcessingStage = "input", options?: ErrorOptions) {
    super(message, options);
    this.name = "PhotoValidationError";
    this.stage = stage;
  }
}

function requireWasmModule(label: string, candidate: unknown): WebAssembly.Module {
  try {
    // Use the WebAssembly API's native brand check instead of trusting an
    // asset URL/string returned by a bundler. jSquash's init() requires a
    // compiled WebAssembly.Module, not a URL or byte array.
    WebAssembly.Module.exports(candidate as WebAssembly.Module);
    if (!(candidate instanceof WebAssembly.Module)) {
      throw new TypeError("The imported module is not from this Worker realm.");
    }
    return candidate;
  } catch (error) {
    const kind = candidate === null ? "null" : typeof candidate;
    const tag = Object.prototype.toString.call(candidate);
    const sameRealm = candidate instanceof WebAssembly.Module;
    throw new TypeError(
      `${label} WASM import is not a usable WebAssembly.Module (type=${kind}, tag=${tag}, sameRealm=${sameRealm}).`,
      { cause: error },
    );
  }
}

const JPEG_DECODER_WARMUP_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDlKKKK+1PVP//Z";

function jpegWarmupBytes(): ArrayBuffer {
  const binary = atob(JPEG_DECODER_WARMUP_BASE64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

async function withCodecTimeout<T>(operation: Promise<T>, label: string, timeoutMs = 15_000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} did not become ready within ${timeoutMs} ms.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

const imageDataGlobal = globalThis as typeof globalThis & { ImageData?: new (data: Uint8ClampedArray, width: number, height: number) => unknown };
if (!imageDataGlobal.ImageData) {
  imageDataGlobal.ImageData = class {
    data: Uint8ClampedArray; width: number; height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) { this.data = data; this.width = width; this.height = height; }
  };
}
const codecsReady = (async () => {
  // Initialize one codec at a time so a production Worker failure identifies
  // the exact WASM module instead of collapsing every failure into one code.
  try {
    const module = requireWasmModule("JPEG decoder", jpegDecoderWasm);
    await initJpegDecoder(module);
  } catch (error) {
    throw new PhotoValidationError("JPEG decoding is temporarily unavailable.", "jpeg_decoder_init", { cause: error });
  }

  // jSquash init() returns before Emscripten has finished instantiating.
  // Keep that first decode distinct from module import/init diagnostics.
  try {
    const warmup = await withCodecTimeout(decodeJpeg(jpegWarmupBytes()), "JPEG decoder warm-up");
    if (warmup.width !== 2 || warmup.height !== 2) {
      throw new Error("JPEG decoder warm-up returned unexpected dimensions.");
    }
  } catch (error) {
    throw new PhotoValidationError("JPEG decoding is temporarily unavailable.", "jpeg_decoder_warmup", { cause: error });
  }

  try { await initPngDecoder(requireWasmModule("PNG decoder", pngDecoderWasm)); }
  catch (error) { throw new PhotoValidationError("PNG decoding is temporarily unavailable.", "png_decoder_init", { cause: error }); }

  try { await initWebpDecoder(requireWasmModule("WebP decoder", webpDecoderWasm)); }
  catch (error) { throw new PhotoValidationError("WebP decoding is temporarily unavailable.", "webp_decoder_init", { cause: error }); }

  // SIMD is optional. If detection or SIMD initialization fails, use the
  // portable encoder, but preserve the real scalar initialization failure.
  try {
    if (await simd()) {
      await initWebpEncoder(requireWasmModule("WebP SIMD encoder", webpEncoderSimdWasm));
      return;
    }
  } catch {
    // Fall through to the portable scalar encoder.
  }
  try { await initWebpEncoder(requireWasmModule("WebP encoder", webpEncoderWasm)); }
  catch (error) { throw new PhotoValidationError("WebP encoding is temporarily unavailable.", "webp_encoder_init", { cause: error }); }
})();

function fail(message: string, stage: PhotoProcessingStage = "header"): never {
  throw new PhotoValidationError(message, stage);
}
function u16be(b: Uint8Array, o: number) { return (b[o] << 8) | b[o + 1]; }
function u24le(b: Uint8Array, o: number) { return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16); }
function u32le(b: Uint8Array, o: number) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
function u32be(b: Uint8Array, o: number) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
const PNG_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[n] = value >>> 0;
  }
  return table;
})();
function pngCrc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) crc = (crc >>> 8) ^ PNG_CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function ascii(b: Uint8Array, o: number, n: number) { return String.fromCharCode(...b.subarray(o, o + n)); }

function jpegHeader(b: Uint8Array) {
  if (b.length < 16 || b[0] !== 255 || b[1] !== 216 || b[b.length - 2] !== 255 || b[b.length - 1] !== 217) fail("The JPEG file is malformed, truncated or has trailing data.");
  const sof = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  let o = 2, width = 0, height = 0, scan = false;
  while (o < b.length - 2) {
    if (b[o] !== 255) fail("The JPEG marker sequence is invalid.");
    while (o < b.length && b[o] === 255) o++;
    const marker = b[o++];
    if (marker === 217) break;
    if (marker === 218) { scan = true; break; }
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    if (o + 2 > b.length) fail("The JPEG file is truncated.");
    const length = u16be(b, o);
    if (length < 2 || o + length > b.length) fail("The JPEG segment is malformed.");
    if (sof.has(marker)) {
      if (length < 8) fail("The JPEG dimensions are malformed.");
      height = u16be(b, o + 3); width = u16be(b, o + 5);
    }
    o += length;
  }
  if (!scan || !width || !height) fail("The JPEG image data or dimensions are missing.");
  return { mime: "image/jpeg" as const, width, height };
}

function pngHeader(b: Uint8Array) {
  const sig = [137,80,78,71,13,10,26,10];
  if (b.length < 45 || sig.some((v,i) => b[i] !== v) || u32be(b,8) !== 13 || ascii(b,12,4) !== "IHDR") fail("The PNG file is malformed.");
  const width = u32be(b,16), height = u32be(b,20);
  let o = 8, end = false;
  while (o + 12 <= b.length) {
    const len = u32be(b,o), type = ascii(b,o+4,4);
    if (len > PHOTO_MAX_BYTES || o + 12 + len > b.length) fail("The PNG contains a truncated or oversized chunk.");
    const crcOffset = o + 8 + len;
    if (pngCrc32(b, o + 4, crcOffset) !== u32be(b, crcOffset)) fail("The PNG chunk checksum is invalid.");
    if (type === "acTL" || type === "fcTL" || type === "fdAT") fail("Animated PNG files are not supported.");
    o += 12 + len;
    if (type === "IEND") {
      if (len !== 0 || o !== b.length) fail("The PNG has trailing or malformed data.");
      end = true; break;
    }
  }
  if (!end || !width || !height) fail("The PNG end marker or dimensions are missing.");
  return { mime: "image/png" as const, width, height };
}

function webpHeader(b: Uint8Array) {
  if (b.length < 30 || ascii(b,0,4) !== "RIFF" || ascii(b,8,4) !== "WEBP") fail("The WebP file is malformed.");
  if (u32le(b,4) + 8 !== b.length) fail("The WebP file is truncated or has trailing data.");
  let o = 12, width = 0, height = 0, image = false;
  while (o + 8 <= b.length) {
    const type = ascii(b,o,4), len = u32le(b,o+4), d = o+8;
    if (d + len + (len & 1) > b.length) fail("The WebP chunk is truncated.");
    if (type === "ANIM" || type === "ANMF") fail("Animated WebP files are not supported.");
    if (type === "VP8X") {
      if (len < 10 || (b[d] & 2) !== 0) fail("Animated or malformed WebP files are not supported.");
      width = u24le(b,d+4)+1; height = u24le(b,d+7)+1; image = true;
    } else if (type === "VP8 " && len >= 10) {
      if (b[d+3] !== 157 || b[d+4] !== 1 || b[d+5] !== 42) fail("The WebP frame header is invalid.");
      width = (b[d+6] | (b[d+7] << 8)) & 0x3fff; height = (b[d+8] | (b[d+9] << 8)) & 0x3fff; image = true;
    } else if (type === "VP8L" && len >= 5) {
      if (b[d] !== 47) fail("The WebP lossless header is invalid.");
      width = 1 + (((b[d+2] & 0x3f) << 8) | b[d+1]);
      height = 1 + (((b[d+4] & 0x0f) << 10) | (b[d+3] << 2) | ((b[d+2] & 0xc0) >> 6)); image = true;
    }
    o = d + len + (len & 1);
  }
  if (o !== b.length || !image || !width || !height) fail("The WebP image data or dimensions are missing.");
  return { mime: "image/webp" as const, width, height };
}
function inspectHeader(b: Uint8Array) {
  if (b[0] === 255 && b[1] === 216) return jpegHeader(b);
  if (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) return pngHeader(b);
  if (ascii(b,0,4) === "RIFF" && ascii(b,8,4) === "WEBP") return webpHeader(b);
  return fail("Only valid JPEG, PNG and WebP images are accepted.");
}

export async function validateAndNormalizePhoto(input: ArrayBuffer, declaredMimeType: string): Promise<ValidatedPhoto> {
  if (!(input instanceof ArrayBuffer) || input.byteLength < 16 || input.byteLength > PHOTO_MAX_BYTES) fail("Each photo must be between 1 byte and 5 MB.");
  let header: ReturnType<typeof inspectHeader>;
  try { header = inspectHeader(new Uint8Array(input)); }
  catch (error) {
    if (error instanceof PhotoValidationError) throw error;
    throw new PhotoValidationError("The image header could not be inspected.", "header");
  }
  if (declaredMimeType && declaredMimeType !== header.mime) fail("The file type does not match its actual image format.");
  if (header.width > PHOTO_MAX_WIDTH || header.height > PHOTO_MAX_HEIGHT || header.width * header.height > PHOTO_MAX_PIXELS) {
    fail("This photo is too large. Use an image up to 8192 pixels per side and 6 megapixels.");
  }
  try { await codecsReady; }
  catch (error) {
    if (error instanceof PhotoValidationError) throw error;
    throw new PhotoValidationError("Image processing is temporarily unavailable.", "webp_encoder_init", { cause: error });
  }
  let decoded: ImageData;
  try {
    if (header.mime === "image/jpeg") decoded = await withCodecTimeout(decodeJpeg(input), "JPEG decoding");
    else if (header.mime === "image/png") decoded = await withCodecTimeout(decodePng(input), "PNG decoding");
    else decoded = await withCodecTimeout(decodeWebp(input), "WebP decoding");
  } catch { fail("The image could not be decoded. It may be corrupt or incomplete.", "decode"); }
  if (!decoded.width || !decoded.height || decoded.width * decoded.height > PHOTO_MAX_PIXELS
      || decoded.width > PHOTO_MAX_WIDTH || decoded.height > PHOTO_MAX_HEIGHT
      || decoded.data.length !== decoded.width * decoded.height * 4) fail("The decoded image dimensions are invalid.");
  let normalized: ArrayBuffer;
  try { normalized = await withCodecTimeout(encodeWebp(decoded, { quality: 78, alpha_quality: 90, method: 4 }), "WebP encoding"); }
  catch { fail("The image could not be safely re-encoded.", "encode"); }
  if (!(normalized instanceof ArrayBuffer) || normalized.byteLength < 16 || normalized.byteLength > PHOTO_MAX_BYTES) {
    fail("The processed photo is too large. Choose a smaller or simpler image.");
  }
  let digest: ArrayBuffer;
  try { digest = await crypto.subtle.digest("SHA-256", normalized); }
  catch { fail("The processed image could not be securely fingerprinted.", "digest"); }
  const sha256Hex = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2,"0")).join("");
  return { bytes: normalized, mimeType: "image/webp", sourceMimeType: header.mime, width: decoded.width,
    height: decoded.height, sourceFileSizeBytes: input.byteLength, fileSizeBytes: normalized.byteLength, sha256Hex };
}
