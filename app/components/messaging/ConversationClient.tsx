"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase/client";
import { MemberShareButton } from "@/app/components/profile/MemberActions";

export type ChatMessage = {
  id: string; sender_id: string; body: string; created_at: string;
  read_at?: string | null; reply_to_message_id?: string | null;
  edited_at?: string | null; deleted_at?: string | null;
};
const MESSAGE_FIELDS = "id,sender_id,body,created_at,read_at,reply_to_message_id,edited_at,deleted_at";

export default function ConversationClient({ conversationId, matchId, currentUserId, otherMemberId, initialMessages }: { conversationId: string; matchId: string; currentUserId: string; otherMemberId: string; initialMessages: ChatMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [conversationClosed, setConversationClosed] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);

  async function refreshMessages() {
    if (!supabase) return;
    const { data, error } = await supabase.from("messages").select(MESSAGE_FIELDS).eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
    if (!error && data) setMessages(data as ChatMessage[]);
  }

  useEffect(() => {
    if (!supabase) return;
    void supabase.rpc("joyheart_mark_conversation_read", { p_conversation_id: conversationId });
    const channel = supabase.channel("joyheart-conversation-" + conversationId)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: "conversation_id=eq." + conversationId }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as { id?: string };
          if (oldRow.id) setMessages((current) => current.filter((message) => message.id !== oldRow.id));
          return;
        }
        const row = payload.new as ChatMessage;
        if (!row?.id) return;
        setMessages((current) => {
          const exists = current.some((message) => message.id === row.id);
          return exists ? current.map((message) => message.id === row.id ? { ...message, ...row } : message) : [...current, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
        });
        if (row.sender_id !== currentUserId && !row.read_at) void supabase.rpc("joyheart_mark_conversation_read", { p_conversation_id: conversationId });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = body.trim();
    if (!clean || busy || conversationClosed || !supabase) return;
    setBusy(true); setNotice("");
    const { error } = await supabase.rpc("joyheart_send_message", { p_conversation_id: conversationId, p_body: clean, p_reply_to_message_id: replyTo?.id ?? null });
    if (error) setNotice("Your message could not be sent. The conversation may be unavailable.");
    else { setBody(""); setReplyTo(null); await refreshMessages(); }
    setBusy(false);
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !editing || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("joyheart_edit_message", { p_message_id: editing.id, p_body: body.trim() });
    setBusy(false);
    if (error) setNotice("This message could not be edited. The edit window may have expired.");
    else { setEditing(null); setBody(""); setNotice("Message updated."); await refreshMessages(); }
  }

  async function deleteMessage(message: ChatMessage) {
    if (!supabase || !window.confirm("Delete this message? Its content is retained securely for safety review.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("joyheart_delete_message", { p_message_id: message.id });
    setBusy(false);
    if (error) setNotice("This message could not be deleted. The deletion window may have expired.");
    else { setNotice("Message deleted."); await refreshMessages(); }
  }

  async function copyMessage(message: ChatMessage) {
    try { await navigator.clipboard.writeText(message.body); setNotice("Message copied."); }
    catch { setNotice("Copy is unavailable in this browser."); }
  }

  async function unmatchMember() {
    if (!supabase || !window.confirm("Unmatch this member? You will no longer be able to message each other, and this match cannot be reopened.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("joyheart_unmatch_member", { p_match_id: matchId });
    setBusy(false);
    if (error) setNotice("We could not end this match. Please try again.");
    else { setConversationClosed(true); setBody(""); setNotice("You have unmatched. This conversation is now closed."); }
  }

  async function blockMember() {
    if (!supabase || !window.confirm("Block this member? They will no longer be able to message you.")) return;
    const { error } = await supabase.rpc("joyheart_block_member", { p_target_id: otherMemberId });
    if (error) setNotice("We could not block this member. Please try again.");
    else { setConversationClosed(true); setBody(""); setNotice("This member has been blocked. This conversation is now closed."); }
  }

  return <section className="member-panel chat-layout">
    <div className="chat-messages" aria-live="polite">
      {messages.length === 0 ? <div className="member-empty"><div className="empty-mark">♡</div><h2>Say hello</h2><p>Start with a kind message. Respect and kindness make every connection better.</p></div> : messages.map((message) => {
        const own = message.sender_id === currentUserId;
        const quoted = message.reply_to_message_id ? messages.find((item) => item.id === message.reply_to_message_id) : null;
        return <article key={message.id} className={"chat-bubble " + (own ? "mine" : "")}>
          {quoted && <div className="chat-reply-preview">Replying to: {quoted.deleted_at ? "Deleted message" : quoted.body}</div>}
          <div>{message.deleted_at ? "This message was deleted" : message.body}</div>
          <small style={{display:"block",opacity:.7,marginTop:6}}>{new Date(message.created_at).toLocaleString()}{message.edited_at && !message.deleted_at ? " · edited" : ""}{own && message.read_at ? " · Seen" : ""}</small>
          {!message.deleted_at && <div className="chat-message-actions">
            <button type="button" onClick={() => void copyMessage(message)}>Copy</button>
            {!conversationClosed && <button type="button" onClick={() => { setReplyTo(message); setEditing(null); }}>Reply</button>}
            {own && !conversationClosed && <button type="button" onClick={() => { setEditing(message); setBody(message.body); setReplyTo(null); }}>Edit</button>}
            {own && !conversationClosed && <button type="button" onClick={() => void deleteMessage(message)} disabled={busy}>Delete</button>}
            {!own && !conversationClosed && <button type="button" onClick={() => router.push(`/report?member=${encodeURIComponent(otherMemberId)}&conversation=${encodeURIComponent(conversationId)}&message=${encodeURIComponent(message.id)}`)}>Report message</button>}
          </div>}
        </article>;
      })}
    </div>
    {notice && <p className="member-alert" role="status">{notice}</p>}
    {!conversationClosed && <form className="chat-compose" onSubmit={editing ? saveEdit : sendMessage}>
      {(replyTo || editing) && <div className="chat-compose-context">{editing ? "Editing your message" : "Replying to: " + (replyTo?.body ?? "")} <button type="button" onClick={() => { setReplyTo(null); setEditing(null); setBody(""); }}>Cancel</button></div>}
      <textarea aria-label={editing ? "Edit message" : "Your message"} maxLength={4000} placeholder="Write a thoughtful message…" value={body} onChange={(event) => setBody(event.target.value)} />
      <button className="member-action" type="submit" disabled={busy || !body.trim()}>{busy ? "Saving…" : editing ? "Save edit" : "Send message"}</button>
    </form>}
    {!conversationClosed && <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}><button type="button" className="member-action secondary" onClick={unmatchMember} disabled={busy}>Unmatch</button><button type="button" className="member-action secondary" onClick={blockMember} disabled={busy}>Block member</button><button type="button" className="member-action secondary" onClick={() => router.push(`/report?member=${encodeURIComponent(otherMemberId)}&conversation=${encodeURIComponent(conversationId)}`)}>Report member</button><MemberShareButton memberId={otherMemberId} /></div>}
    <p style={{color:"var(--joy-muted)",fontSize:".85rem",margin:0}}>Deleted messages are retained securely for safety review. Blocking or unmatching closes this conversation. Reports are private.</p>
  </section>;
}
