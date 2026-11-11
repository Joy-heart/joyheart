import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await context.params;
  if (!UUID.test(memberId)) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email_confirmed_at) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let admin;
  try { admin = createSupabaseAdminClient(); }
  catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  // The service-role-only RPC returns the private object path only to this server.
  // It rechecks approval, publication, visibility, account eligibility, mutual
  // discovery/match access and blocks for the authenticated viewer on each request.
  const { data, error } = await admin.rpc("joyheart_get_member_primary_photo", {
    p_member_id: memberId,
    p_viewer_id: user.id,
  });
  const photo = Array.isArray(data) ? data[0] : data;
  if (error || !photo?.storage_path) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  }

  // Signed URLs are short-lived; revocation after a state change is bounded to 30 seconds.
  const { data: signed, error: signedError } = await admin.storage
    .from("joyheart-profile-photos")
    .createSignedUrl(photo.storage_path, 30);
  if (signedError || !signed?.signedUrl) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: signed.signedUrl,
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
