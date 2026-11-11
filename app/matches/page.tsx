import Link from "next/link";
export const metadata = { title: "Member area | JoyHeart", robots: { index: false, follow: false } };
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { MemberShareButton, UnlikeButton } from "@/app/components/profile/MemberActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MatchRow = { id: string; member_low: string; member_high: string; created_at: string };

export default async function MatchesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fmatches");

  const { data: matches, error } = await supabase
    .from("profile_matches")
    .select("id,member_low,member_high,created_at")
    .eq("status", "active")
    .or(`member_low.eq.${user.id},member_high.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return <main className="member-area"><div className="member-heading"><div><h1>Your matches</h1><p>Meaningful connections begin with mutual interest.</p></div></div><div className="member-panel"><div className="member-alert">Your matches are being prepared. This area will become available after the matching foundation is approved and installed.</div></div></main>;
  }

  const rows = (matches ?? []) as MatchRow[];
  const { data: outgoingLikes } = await supabase.from("profile_interactions").select("target_id,created_at").eq("actor_id", user.id).eq("action", "like").order("created_at", { ascending: false });
  const likedPeople = await Promise.all((outgoingLikes ?? []).map(async (like) => {
    const { data: profile } = await supabase.from("profiles").select("display_name,country,city").eq("user_id", like.target_id).maybeSingle();
    return { ...like, profile };
  }));
  const people = await Promise.all(rows.map(async (match) => {
    const otherId = match.member_low === user.id ? match.member_high : match.member_low;
    const [{ data: profile }, { data: conversation }] = await Promise.all([
      supabase.from("profiles").select("display_name,country,city").eq("user_id", otherId).maybeSingle(),
      supabase.from("conversations").select("id").eq("match_id", match.id).maybeSingle(),
    ]);
    const { count: unreadCount } = conversation?.id ? await supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversation.id).neq("sender_id", user.id).is("read_at", null) : { count: 0 };
    return { match, profile, conversation, unreadCount: unreadCount ?? 0 };
  }));

  return <main className="member-area">
    <div className="member-heading"><div><h1>Your matches</h1><p>Only mutual likes become matches. Your conversations stay private.</p></div><Link className="member-action secondary" href="/discover">Discover people</Link></div>
    <section className="member-panel">
      {people.length === 0 ? <div className="member-empty"><div className="empty-mark">♡</div><h2>Your story starts here</h2><p>When you and another member both like each other, your match will appear here. Take your time and connect with intention.</p><Link className="member-action" href="/discover">Explore JoyHeart</Link></div> :
        <div className="member-list">{people.map(({ match, profile, conversation, unreadCount }) => <article className="member-list-item" key={match.id}><div><strong>{profile?.display_name || "JoyHeart member"}</strong><small>{[profile?.city, profile?.country].filter(Boolean).join(", ") || "International member"} · Matched {new Date(match.created_at).toLocaleDateString()}</small></div>{conversation?.id ? <div className="safety-report-actions"><Link className="member-action" href={`/messages/${conversation.id}`}>Open conversation{unreadCount > 0 ? ` · ${unreadCount} new` : ""}</Link><MemberShareButton memberId={match.member_low === user.id ? match.member_high : match.member_low} /></div> : <span className="member-alert">Conversation preparing</span>}</article>)}</div>}
    </section>
    <section className="member-panel" style={{marginTop:20}}>
      <h2>Likes you have sent</h2>
      <p className="safety-report-hint">You can remove a like here if it has not become a match. Existing matches are managed separately.</p>
      {likedPeople.length === 0 ? <p>You have no pending outgoing likes.</p> : <div className="member-list">{likedPeople.map((item) => <article className="member-list-item" key={item.target_id}><div><strong>{item.profile?.display_name || "JoyHeart member"}</strong><small>{[item.profile?.city,item.profile?.country].filter(Boolean).join(", ")}</small></div><UnlikeButton memberId={item.target_id} /></article>)}</div>}
    </section>
  </main>;
}
