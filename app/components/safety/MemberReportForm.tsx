"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase/client";

export default function MemberReportForm({
  reportedMemberId,
  conversationId,
  messageId,
}: {
  reportedMemberId: string;
  conversationId: string | null;
  messageId: string | null;
}) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(reportedMemberId);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = memberId.trim();
    const detail = reason.trim();
    if (!supabase || !target || detail.length < 3 || busy) return;
    setBusy(true);
    setNotice("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setNotice("Please sign in again before sending your report.");
      setBusy(false);
      return;
    }
    if (target === user.id) {
      setNotice("You cannot report your own account.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.rpc("joyheart_report_member", {
      p_reported_id: target,
      p_reason: detail,
      p_conversation_id: conversationId,
      p_message_id: messageId,
    });
    setBusy(false);
    if (error) {
      setNotice("We could not submit this report. Check the member reference and try again.");
      return;
    }
    setNotice("Your report has been sent privately to the JoyHeart safety team. Thank you for speaking up.");
    setReason("");
  }

  return (
    <section className="member-panel safety-report-panel">
      <div className="safety-report-intro">
        <span aria-hidden="true">♡</span>
        <div><h2>We take your safety seriously</h2><p>Tell us what happened. Include useful details, but do not share passwords, payment details or other sensitive information.</p></div>
      </div>
      <form className="safety-report-form" onSubmit={submit}>
        {reportedMemberId ? (
          <>
            <label htmlFor="reported-member">Member being reported</label>
            <input id="reported-member" value="Member from your JoyHeart conversation" readOnly aria-readonly="true" />
          </>
        ) : (
          <div className="safety-report-hint">
            To report a member, open your conversation with them and choose <strong>Report member</strong> or <strong>Report message</strong>. JoyHeart will attach the member details automatically.
            <p><a href="/messages">Go to your conversations</a></p>
          </div>
        )}
        <label htmlFor="report-details">What would you like us to know?</label>
        <textarea id="report-details" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required rows={7} placeholder="Describe the behaviour or concern. Please be as clear as you can." />
        <p className="safety-report-hint">Reports are reviewed privately. Submitting a report does not automatically notify the reported member.</p>
        {notice && <p className="member-alert" role="status">{notice}</p>}
        <div className="safety-report-actions">
          <button className="member-action" type="submit" disabled={busy || !memberId.trim() || reason.trim().length < 3}>{busy ? "Sending…" : "Send private report"}</button>
          <button className="member-action secondary" type="button" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
