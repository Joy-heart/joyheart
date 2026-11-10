"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

export function MemberShareButton({ memberId, label = "Share profile" }: { memberId: string; label?: string }) {
  const [notice, setNotice] = useState("");
  async function share() {
    const url = `${window.location.origin}/members/${encodeURIComponent(memberId)}`;
    try {
      if (navigator.share) await navigator.share({ title: "JoyHeart member", text: "View this JoyHeart connection", url });
      else { await navigator.clipboard.writeText(url); setNotice("Private profile link copied."); }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      try { await navigator.clipboard.writeText(url); setNotice("Private profile link copied."); }
      catch { setNotice("Sharing is not available in this browser."); }
    }
  }
  return <span><button type="button" className="member-action secondary" onClick={() => void share()}>{label}</button>{notice && <small role="status">{notice}</small>}</span>;
}

export function UnlikeButton({ memberId }: { memberId: string }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function unlike() {
    if (!supabase || busy) return;
    if (!window.confirm("Remove your like? This does not affect an existing match.")) return;
    setBusy(true); setNotice("");
    const { error } = await supabase.rpc("joyheart_remove_like", { p_target_id: memberId });
    setBusy(false);
    if (error) setNotice(error.message.includes("already a match") ? "You are already matched. Use Unmatch from the conversation." : "We could not remove this like. Please try again.");
    else { setNotice("Like removed."); window.location.reload(); }
  }
  return <span><button type="button" className="member-action secondary" onClick={() => void unlike()} disabled={busy}>{busy ? "Removing…" : "Unlike"}</button>{notice && <small role="status">{notice}</small>}</span>;
}
