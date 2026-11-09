import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ConversationClient, { type ChatMessage } from "@/app/components/messaging/ConversationClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/messages/${conversationId}`)}`);

  const { data: conversation } = await supabase.from("conversations").select("id,match_id").eq("id", conversationId).maybeSingle();
  if (!conversation) notFound();
  const { data: match } = await supabase.from("profile_matches").select("member_low,member_high,status").eq("id", conversation.match_id).maybeSingle();
  if (!match || match.status !== "active" || ![match.member_low, match.member_high].includes(user.id)) notFound();

  const otherId = match.member_low === user.id ? match.member_high : match.member_low;
  const [{ data: profile }, { data: messages, error }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", otherId).maybeSingle(),
    supabase.from("messages").select("id,sender_id,body,created_at,read_at,reply_to_message_id,edited_at,deleted_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100),
  ]);

  return <main className="member-area">
    <div className="member-heading"><div><Link href="/matches" className="member-action secondary">← Matches</Link><h1 style={{marginTop:16}}>{profile?.display_name || "Your match"}</h1><p>A private conversation for the two of you.</p></div></div>
    {error ? <div className="member-panel"><div className="member-alert">Messages are temporarily unavailable. Please refresh the page or return to your matches and try again.</div></div> : <ConversationClient conversationId={conversationId} matchId={conversation.match_id} currentUserId={user.id} initialMessages={(messages ?? []) as ChatMessage[]} otherMemberId={otherId} />}
  </main>;
}
