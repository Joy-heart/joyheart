import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getRemovablePhotoObjects } from "@/app/lib/photos/cleanup.mjs";

export const dynamic = "force-dynamic";
const BUCKET = "joyheart-profile-photos";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email_confirmed_at) return NextResponse.json({ error: "Sign in with a verified staff account." }, { status: 401 });
  const { data: isStaff, error: staffError } = await supabase.rpc("joyheart_is_active_staff");
  if (staffError || !isStaff) return NextResponse.json({ error: "Staff access is required." }, { status: 403 });

  let admin;
  try { admin = createSupabaseAdminClient(); }
  catch { return NextResponse.json({ error: "Secure photo cleanup is not configured on the Worker yet." }, { status: 503 }); }

  const candidates: string[] = [];
  let rootOffset = 0;
  while (rootOffset < 2000 && candidates.length < 500) {
    const { data: folders, error } = await admin.storage.from(BUCKET).list("", { limit: 500, offset: rootOffset });
    if (error) return NextResponse.json({ error: "The private photo bucket could not be scanned." }, { status: 503 });
    if (!folders?.length) break;
    for (const folder of folders) {
      if (!UUID.test(folder.name) || folder.id !== null) continue;
      let offset = 0;
      while (offset < 2000 && candidates.length < 500) {
        const { data: objects, error: listError } = await admin.storage.from(BUCKET).list(folder.name, { limit: 500, offset });
        if (listError) return NextResponse.json({ error: "A private member photo folder could not be scanned." }, { status: 503 });
        if (!objects?.length) break;
        for (const object of objects) {
          if (!object.id || !object.created_at) continue;
          const createdAt = Date.parse(object.created_at);
          if (!Number.isFinite(createdAt) || Date.now() - createdAt < ORPHAN_AGE_MS) continue;
          candidates.push(`${folder.name}/${object.name}`);
          if (candidates.length >= 500) break;
        }
        if (objects.length < 500) break;
        offset += 500;
      }
      if (candidates.length >= 500) break;
    }
    if (folders.length < 500) break;
    rootOffset += 500;
  }

  let removed = 0;
  for (let index = 0; index < candidates.length; index += 100) {
    const batch = candidates.slice(index, index + 100);
    const { data: referenced, error: referenceError } = await admin.from("profile_photos")
      .select("storage_path,moderation_status").in("storage_path", batch);
    if (referenceError) return NextResponse.json({ error: "Photo metadata could not be checked. No files were removed in this batch." }, { status: 503 });
    // Keep pending, approved and rejected photos. Removed objects and unreferenced
    // uploads can be deleted without touching approved member photos.
    const orphans = getRemovablePhotoObjects(batch, referenced ?? []);
    if (!orphans.length) continue;
    const { error: removeError } = await admin.storage.from(BUCKET).remove(orphans);
    if (removeError) return NextResponse.json({ error: "Some orphaned private uploads could not be removed.", removed }, { status: 503 });
    removed += orphans.length;
  }

  return NextResponse.json({ success: true, scanned: candidates.length, removed }, {
    headers: { "Cache-Control": "no-store" },
  });
}
