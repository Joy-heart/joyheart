import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = "joyheart-profile-photos";

export async function DELETE(request: NextRequest, context: { params: Promise<{ photoId: string }> }) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const { photoId } = await context.params;
  if (!UUID.test(photoId)) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email_confirmed_at) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let admin;
  try { admin = createSupabaseAdminClient(); }
  catch { return NextResponse.json({ error: "Secure photo removal is not configured on the Worker yet." }, { status: 503 }); }

  const { data: photo, error: photoError } = await admin.from("profile_photos")
    .select("id,user_id,storage_path").eq("id", photoId).maybeSingle();
  if (photoError || !photo || photo.user_id !== user.id) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  // Mark it removed first. Delivery authorization immediately fails closed.
  const { error: removalError } = await supabase.rpc("joyheart_remove_profile_photo", { p_photo_id: photoId });
  if (removalError) return NextResponse.json({ error: "The photo could not be removed. Please refresh and try again." }, { status: 409 });

  const { error: storageError } = await admin.storage.from(BUCKET).remove([photo.storage_path]);
  if (storageError) {
    return NextResponse.json({ success: true, cleanupPending: true }, {
      status: 202, headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({ success: true, cleanupPending: false }, { headers: { "Cache-Control": "no-store" } });
}
