import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { MemberShareButton } from "@/app/components/profile/MemberActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SharedMemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/members/${memberId}`)}`);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberId) || memberId === user.id) notFound();

  const low = user.id < memberId ? user.id : memberId;
  const high = user.id < memberId ? memberId : user.id;
  const { data: match } = await supabase.from("profile_matches").select("id").eq("member_low", low).eq("member_high", high).eq("status", "active").maybeSingle();
  if (!match) notFound();

  const { data: profile } = await supabase.from("profiles").select("display_name,country,city,bio,interests,relationship_intention").eq("user_id", memberId).maybeSingle();
  if (!profile) notFound();

  return <main className="member-area">
    <div className="member-heading"><div><p className="safety-eyebrow">JoyHeart connection</p><h1>{profile.display_name || "JoyHeart member"}</h1><p>{[profile.city,profile.country].filter(Boolean).join(", ")}</p></div></div>
    <section className="member-panel">
      <h2>About</h2><p>{profile.bio || "This member has not added an introduction yet."}</p>
      {profile.relationship_intention && <p><strong>Looking for:</strong> {profile.relationship_intention}</p>}
      {profile.interests?.length ? <p><strong>Interests:</strong> {profile.interests.join(" · ")}</p> : null}
      <div className="safety-report-actions"><Link className="member-action" href={`/messages/${(await supabase.from("conversations").select("id").eq("match_id",match.id).maybeSingle()).data?.id ?? ""}`}>Open conversation</Link><MemberShareButton memberId={memberId} label="Share profile link" /><Link className="member-action secondary" href={`/report?member=${memberId}`}>Report concern</Link></div>
      <p className="safety-report-hint">This shared profile is private. Only this member’s active JoyHeart match can view it. The link will stop working if the match ends or either member blocks the other.</p>
    </section>
  </main>;
}
