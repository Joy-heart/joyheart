"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export default function ConversationClient({ conversationId, currentUserId, initialMessages }: { conversationId: string; currentUserId: string; initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

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

  return <section className="member-panel chat-layout">
    <div className="chat-messages" aria-live="polite">
      {messages.length === 0 ? <div className="member-empty"><div className="empty-mark">♡</div><h2>Say hello</h2><p>Start with a kind message. Respect and kindness make every connection better.</p></div> : messages.map((message) => <div key={message.id} className={`chat-bubble ${message.sender_id === currentUserId ? "mine" : ""}`}><div>{message.body}</div><small style={{display:"block",opacity:.7,marginTop:6}}>{new Date(message.created_at).toLocaleString()}</small></div>)}
    </div>
    {notice && <p className="member-alert" role="status">{notice}</p>}
    <form className="chat-compose" onSubmit={sendMessage}>
      <textarea aria-label="Your message" maxLength={4000} placeholder="Write a thoughtful message…" value={body} onChange={(event) => setBody(event.target.value)} />
      <button className="member-action" type="submit" disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send message"}</button>
    </form>
    <p style={{color:"var(--joy-muted)",fontSize:".85rem",margin:0}}>Keep personal information private. You can block or report a member if something feels wrong.</p>
  </section>;
}
