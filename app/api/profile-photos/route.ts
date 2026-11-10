import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { PHOTO_MAX_BYTES, PhotoValidationError, validateAndNormalizePhoto } from "@/app/lib/photos/image-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "joyheart-profile-photos";
const MAX_MULTIPART_BYTES = PHOTO_MAX_BYTES + 128 * 1024;

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin && request.headers.get("sec-fetch-site") !== "cross-site");
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("user_id,publication_status").eq("user_id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "We could not verify your profile." }, { status: 503 });
  if (!profile || profile.publication_status === "restricted") {
    return NextResponse.json({ error: "Complete your profile before uploading photos." }, { status: 409 });
  }

  let validated;
  try {
    validated = await validateAndNormalizePhoto(await file.arrayBuffer(), file.type);
  } catch (error) {
    const message = error instanceof PhotoValidationError ? error.message : "The image could not be processed safely.";
    return NextResponse.json({ error: message }, { status: 400 });
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
