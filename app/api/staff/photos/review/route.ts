import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email_confirmed_at) {
    return NextResponse.json({ error: "Please sign in with a verified staff account." }, { status: 401 });
  }

  const { data: isStaff, error: roleError } = await supabase.rpc("joyheart_is_active_staff");
  if (roleError || !isStaff) {
    return NextResponse.json({ error: "You are not authorised to review photos." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("photoId" in body) || !("decision" in body)) {
    return NextResponse.json({ error: "A photo and decision are required." }, { status: 400 });
  }

  const { photoId, decision, reason } = body as { photoId: unknown; decision: unknown; reason?: unknown };
  const validUuid = typeof photoId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photoId);
  const validReason = reason === undefined || (typeof reason === "string" && reason.trim().length <= 500);
  if (!validUuid || !validReason || (decision !== "approved" && decision !== "rejected")
      || (decision === "rejected" && (typeof reason !== "string" || !reason.trim()))) {
    return NextResponse.json({ error: "Invalid photo review details." }, { status: 400 });
  }

  const { error } = await supabase.rpc("joyheart_review_profile_photo", {
    p_photo_id: photoId,
    p_decision: decision,
    p_reason: typeof reason === "string" ? reason.trim() : null,
  });
  if (error) {
    const forbidden = error.message.includes("STAFF_REQUIRED") || error.message.includes("CANNOT_REVIEW_OWN");
    return NextResponse.json(
      { error: forbidden ? "You are not authorised to review this photo." : "This photo may already have been reviewed. Refresh the queue and try again." },
      { status: forbidden ? 403 : 409 },
    );
  }

  return NextResponse.json({ success: true });
}
