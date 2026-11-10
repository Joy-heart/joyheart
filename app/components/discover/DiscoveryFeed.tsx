"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

type Candidate = {
  candidate_id: string;
  display_name: string;
  age: number;
  country: string;
  city: string | null;
  bio: string | null;
  interests: string[] | null;
  relationship_intention: string | null;
  compatibility_score: number;
  compatibility_reasons: string[] | null;
};

export default function DiscoveryFeed() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setError(true); setNotice("Discovery is temporarily unavailable. Please try again."); setLoading(false); return;
    }
    setLoading(true); setError(false); setNotice("");
    const { data, error: requestError } = await supabase.rpc("joyheart_discover_candidates", { p_limit: 20 });
    if (requestError) {
      setError(true); setNotice("We couldn't load recommendations. Please try again.");
      setItems([]);
    } else {
      setItems((data ?? []) as Candidate[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function respond(candidate: Candidate, action: "like" | "pass") {
    if (!supabase || busyId) return;
    setBusyId(candidate.candidate_id); setNotice("");
    const { data, error: actionError } = await supabase.rpc("joyheart_record_interaction", {
      p_target_id: candidate.candidate_id,
      p_action: action,
    });
    setBusyId(null);
    if (actionError) {
      setNotice(actionError.message.includes("unavailable for discovery")
        ? "This profile is no longer available. Refresh your recommendations."
        : "We couldn't save that choice. Please try again.");
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    setItems((current) => current.filter((item) => item.candidate_id !== candidate.candidate_id));
    if (action === "like" && result?.matched) {
      setNotice("It's a match! You can start your private conversation in Your matches.");
    } else {
      setNotice(action === "like" ? "Like sent. We'll let you know if it's mutual." : "Profile passed.");
    }
  }

  return <section className="discovery-feed" aria-live="polite">
    {notice && <p className={error ? "profile-form-notice error" : "profile-form-notice success"} role="status">{notice}</p>}
    {loading ? <div className="member-panel"><p role="status">Finding compatible people…</p></div> :
      error ? <div className="member-panel"><div className="member-empty"><h2>Recommendations unavailable</h2><p>{notice}</p><button className="member-action" type="button" onClick={() => void load()}>Try again</button></div></div> :
      items.length === 0 ? <div className="member-panel"><div className="member-empty">
        <div className="empty-mark">♡</div><h2>Your discovery space is being prepared</h2>
        <p>Member discovery is still safely closed while we complete the launch checks. Your private preferences are saved, but no member profiles are being shown.</p>
        <Link className="member-action" href="/account">Review my profile and preferences</Link>
        <p className="explore-coming-soon">When discovery opens, recommendations will respect both members' age, country, relationship and gender preferences, opt-in choices, blocks and previous decisions.</p>
      </div></div> :
      <div className="discovery-grid">{items.map((candidate) => <article className="discovery-card" key={candidate.candidate_id}>
        <div className="discovery-card-top"><span className="discovery-score">{candidate.compatibility_score}% compatibility</span><span className="discovery-age">{candidate.age}</span></div>
        <img className="discovery-card-photo" src={`/api/profile-photos/member/${encodeURIComponent(candidate.candidate_id)}`} alt={`${candidate.display_name}'s approved profile photo`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.opacity = "0"; }} />
        <div className="discovery-card-content">
          <h2>{candidate.display_name}</h2>
          <p className="discovery-location">{[candidate.city, candidate.country].filter(Boolean).join(", ")}</p>
          {candidate.relationship_intention && <p className="discovery-intention">{candidate.relationship_intention}</p>}
          {candidate.bio && <p className="discovery-bio">{candidate.bio}</p>}
          {candidate.interests?.length ? <div className="discovery-interests">{candidate.interests.slice(0,8).map((interest) => <span key={interest}>{interest}</span>)}</div> : null}
          {candidate.compatibility_reasons?.length ? <div className="discovery-reasons"><strong>Why you may connect</strong><ul>{candidate.compatibility_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}
        </div>
        <div className="discovery-actions"><button className="member-action secondary" type="button" disabled={busyId === candidate.candidate_id} onClick={() => void respond(candidate,"pass")}>Pass</button><button className="member-action" type="button" disabled={busyId === candidate.candidate_id} onClick={() => void respond(candidate,"like")}>{busyId === candidate.candidate_id ? "Saving…" : "Like"}</button></div>
      </article>)}</div>}
  </section>;
}
