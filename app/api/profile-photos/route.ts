import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "joyheart-profile-photos";
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MAX_WIDTH = 8192;
const PHOTO_MAX_HEIGHT = 8192;
const PHOTO_MAX_PIXELS = 6_000_000;
const MAX_MULTIPART_BYTES = PHOTO_MAX_BYTES + 128 * 1024;
const PROCESSOR_TIMEOUT_MS = 60_000;

type NormalizedPhoto = {
  bytes: ArrayBuffer;
  sourceMimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  sourceFileSizeBytes: number;
  fileSizeBytes: number;
  sha256Hex: string;
};

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin && request.headers.get("sec-fetch-site") !== "cross-site");
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(secret: string, message: Uint8Array) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
}

async function sha256Hex(bytes: ArrayBuffer) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

async function normalizeWithPhotoProcessor(input: ArrayBuffer, declaredMimeType: string): Promise<NormalizedPhoto> {
  const processorUrl = process.env.PHOTO_PROCESSOR_URL;
  const secret = process.env.PHOTO_PROCESSOR_SHARED_SECRET;
  if (!processorUrl || !secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("Photo processing service is not securely configured.");
  }
  let endpoint: URL;
  try {
    endpoint = new URL("/v1/normalize", processorUrl);
  } catch {
    throw new Error("Photo processing service URL is invalid.");
  }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
    throw new Error("Photo processing service must use a secure HTTPS URL.");
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = toHex(nonceBytes);
  const prefix = new TextEncoder().encode(`${timestamp}.${nonce}.`);
  const signedBody = new Uint8Array(prefix.byteLength + input.byteLength);
  signedBody.set(prefix);
  signedBody.set(new Uint8Array(input), prefix.byteLength);
  const signature = toHex(await hmacSha256(secret, signedBody));

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Photo-Timestamp": timestamp,
        "X-Photo-Nonce": nonce,
        "X-Photo-Signature": signature,
      },
      body: input,
      signal: AbortSignal.timeout(PROCESSOR_TIMEOUT_MS),
      redirect: "error",
    });
  } catch {
    throw new Error("Photo processing service is temporarily unavailable.");
  }
  if (!response.ok) {
    // Do not forward internal processor details to a member or log request data.
    throw new Error(response.status === 429
      ? "Photo processing is busy. Please try again shortly."
      : "The photo could not be processed safely. Please try again.");
  }
  if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "image/webp") {
    throw new Error("Photo processing service returned an invalid image.");
  }

  const bytes = await response.arrayBuffer();
  const sourceMimeType = response.headers.get("x-photo-source-mime");
  const width = Number(response.headers.get("x-photo-width"));
  const height = Number(response.headers.get("x-photo-height"));
  const sourceFileSizeBytes = Number(response.headers.get("x-photo-source-size"));
  const fileSizeBytes = Number(response.headers.get("x-photo-output-size"));
  const claimedSha256 = response.headers.get("x-photo-sha256")?.toLowerCase() ?? "";
  const allowedSourceTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedSourceTypes.has(sourceMimeType ?? "")
      || (declaredMimeType && declaredMimeType !== sourceMimeType)
      || !Number.isSafeInteger(width) || width < 1 || width > PHOTO_MAX_WIDTH
      || !Number.isSafeInteger(height) || height < 1 || height > PHOTO_MAX_HEIGHT
      || width * height > PHOTO_MAX_PIXELS
      || sourceFileSizeBytes !== input.byteLength
      || fileSizeBytes !== bytes.byteLength
      || bytes.byteLength < 16 || bytes.byteLength > PHOTO_MAX_BYTES
      || !/^[a-f0-9]{64}$/.test(claimedSha256)) {
    throw new Error("Photo processing service returned invalid image metadata.");
  }
  const actualSha256 = await sha256Hex(bytes);
  if (actualSha256 !== claimedSha256) {
    throw new Error("Photo processing service image integrity check failed.");
  }

  return {
    bytes,
    sourceMimeType: sourceMimeType as NormalizedPhoto["sourceMimeType"],
    width,
    height,
    sourceFileSizeBytes,
    fileSizeBytes,
    sha256Hex: actualSha256,
  };
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)) {
    return NextResponse.json({ error: "Choose one photo to upload." }, { status: 400 });
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      return NextResponse.json({ error: "The upload request is invalid." }, { status: 400 });
    }
    if (declaredLength > MAX_MULTIPART_BYTES) {
      return NextResponse.json({ error: "The upload is larger than 5 MB." }, { status: 413 });
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email_confirmed_at) {
    return NextResponse.json({ error: "Please sign in with your verified account." }, { status: 401 });
  }

  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "The upload form is empty." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_MULTIPART_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "The upload is larger than 5 MB." }, { status: 413 });
      }
      chunks.push(value);
    }
    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    form = await new Response(body, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    return NextResponse.json({ error: "The upload form is invalid." }, { status: 400 });
  }
  if (Array.from(form.entries()).length !== 1 || form.getAll("photo").length !== 1 || !(form.get("photo") instanceof File)) {
    return NextResponse.json({ error: "Choose one photo to upload." }, { status: 400 });
  }
  const file = form.get("photo") as File;
  if (file.size < 1 || file.size > PHOTO_MAX_BYTES) {
    return NextResponse.json({ error: "Each photo must be between 1 byte and 5 MB." }, { status: 413 });
  }

  // publication_status is intentionally not directly readable by authenticated
  // members. Use the owner-scoped SECURITY DEFINER RPC instead of querying the
  // protected profiles column, preserving the profile-column privilege boundary.
  const { data: ownProfileRows, error: profileError } = await supabase.rpc(
    "joyheart_get_own_profile_private_settings",
  );
  if (profileError) {
    return NextResponse.json({ error: "We could not verify your profile." }, { status: 503 });
  }
  const ownProfile = Array.isArray(ownProfileRows) ? ownProfileRows[0] : ownProfileRows;
  if (!ownProfile || ownProfile.publication_status === "restricted") {
    return NextResponse.json({ error: "Complete your profile before uploading photos." }, { status: 409 });
  }

  let validated: NormalizedPhoto;
  try {
    validated = await normalizeWithPhotoProcessor(await file.arrayBuffer(), file.type);
  } catch (error) {
    console.error("[joyheart-photo-processing]", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      diagnostic: error instanceof Error ? error.message.slice(0, 240) : "Unknown processing failure",
      sourceMimeType: file.type,
      sourceFileSizeBytes: file.size,
    });
    const message = error instanceof Error && error.message.includes("busy")
      ? error.message
      : error instanceof Error && error.message.includes("not securely configured")
        ? "Photo uploads are temporarily unavailable while secure processing is configured."
        : "The image could not be processed safely. Please try a JPG, PNG or WebP image.";
    return NextResponse.json({ error: message, code: "PHOTO_PROCESSING_FAILED" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let admin;
  try { admin = createSupabaseAdminClient(); }
  catch { return NextResponse.json({ error: "Secure photo uploads are not configured on the Worker yet." }, { status: 503 }); }

  const { count, error: countError } = await admin.from("profile_photos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("moderation_status", "removed");
  if (countError) return NextResponse.json({ error: "We could not check your photo limit. Please try again." }, { status: 503 });
  if ((count ?? 0) >= 5) return NextResponse.json({ error: "You can add up to five active photos. Remove one before adding another." }, { status: 409 });

  const storagePath = `${user.id}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, validated.bytes, {
    contentType: "image/webp", cacheControl: "0", upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: "The private photo could not be stored. Please try again." }, { status: 503 });

  const { data: photoId, error: registerError } = await admin.rpc("joyheart_register_profile_photo", {
    p_user_id: user.id,
    p_storage_path: storagePath,
    p_source_mime_type: validated.sourceMimeType,
    p_source_file_size_bytes: validated.sourceFileSizeBytes,
    p_file_size_bytes: validated.fileSizeBytes,
    p_image_width: validated.width,
    p_image_height: validated.height,
    p_sha256_hex: validated.sha256Hex,
  });

  if (registerError || !photoId) {
    const { error: cleanupError } = await admin.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({
      error: cleanupError
        ? "The photo could not be registered and its private upload needs cleanup. Please contact support."
        : "The photo could not be registered. Please try again.",
    }, { status: 503 });
  }

  return NextResponse.json({ success: true, photoId, moderationStatus: "pending" }, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}
