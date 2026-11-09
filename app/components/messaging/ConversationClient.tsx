"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export default function ConversationClient({ conversationId, currentUserId, otherMemberId, initialMessages }: { conversationId: string; currentUserId: string; otherMemberId: string; initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");\n  const [reportReason, setReportReason] = useState("");\n  const [reportOpen, setReportOpen] = useState(false);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = body.trim();
    if (!clean || busy) return;
    if (!supabase) { setNotice("Messaging is not configured yet."); return; }
    setBusy(true); setNotice("");
    const { error } = await supabase.rpc("joyheart_send_message", { p_conversation_id: conversationId, p_body: clean });
    if (error) {
      setNotice(error.message.includes("function") ? "Messaging is waiting for the approved database setup." : "Your message could not be sent. The conversation may be unavailable.");
    } else {
      const { data } = await supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
      if (data) setMessages(data as ChatMessage[]);
      setBody("");
    }
    setBusy(false);
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    if (!supabase || reportReason.trim().length < 3) return;\n    const { error } = await supabase.rpc("joyheart_report_member", { p_reported_id: otherMemberId, p_reason: reportReason.trim(), p_conversation_id: conversationId, p_message_id: null });\n    setNotice(error ? "Your report could not be submitted. Please try again." : "Thank you. Your report has been sent privately to JoyHeart.");\n    if (!error) { setReportReason(""); setReportOpen(false); }\n  }\n\n  async function blockMember() {\n    if (!supabase || !window.confirm("Block this member? They will no longer be able to message you.")) return;\n    const { error } = await supabase.rpc("joyheart_block_member", { p_target_id: otherMemberId });\n    setNotice(error ? "We could not block this member. Please try again." : "This member has been blocked. This conversation is now closed.");\n  }\n\n  return <section className="member-panel chat-layout">
    <div className="chat-messages" aria-live="polite">
      {messages.length === 0 ? <div className="member-empty"><div className="empty-mark">♡</div><h2>Say hello</h2><p>Start with a kind message. Respect and kindness make every connection better.</p></div> : messages.map((message) => <div key={message.id} className={`chat-bubble ${message.sender_id === currentUserId ? "mine" : ""}`}><div>{message.body}</div><small style={{display:"block",opacity:.7,marginTop:6}}>{new Date(message.created_at).toLocaleString()}</small></div>)}
    </div>
    {notice && <p className="member-alert" role="status">{notice}</p>}
    <form className="chat-compose" onSubmit={sendMessage}>
      <textarea aria-label="Your message" maxLength={4000} placeholder="Write a thoughtful message…" value={body} onChange={(event) => setBody(event.target.value)} />
      <button className="member-action" type="submit" disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send message"}</button>
    </form>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}><button type="button" className="member-action secondary" onClick={blockMember}>Block member</button><button type="button" className="member-action secondary" onClick={() => setReportOpen((open) => !open)}>Report member</button></div>\n    {reportOpen && <form onSubmit={submitReport} style={{display:"grid",gap:10}}><label htmlFor="report-reason">Why are you reporting this member?</label><textarea id="report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)} minLength={3} maxLength={1000} required placeholder="Tell us what happened…" /><button className="member-action" type="submit" disabled={reportReason.trim().length < 3}>Send private report</button></form>}\n    <p style={{color:"var(--joy-muted)",fontSize:".85rem",margin:0}}>Keep personal information private. Blocking closes this conversation. Reports are private and reviewed by the JoyHeart team.</p>
  </section>;
}
