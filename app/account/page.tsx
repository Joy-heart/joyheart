"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setError("Account access is temporarily unavailable.");
      setLoading(false);
      return;
    }
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) {
        window.location.replace("/login?next=%2Faccount");
        return;
      }
      setEmail(data.user.email ?? "");
      setVerified(Boolean(data.user.email_confirmed_at));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <main className="auth-page"><section className="auth-card"><p className="auth-intro">Loading your account…</p></section></main>;
  if (error) return <main className="auth-page"><section className="auth-card"><p className="auth-message auth-message-error" role="alert">{error}</p></section></main>;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="account-title">
        <div className="auth-brand-lockup"><img src="/joyheart-mark.svg" alt="JoyHeart" width="60" height="60" /><span>JoyHeart</span></div>
        <p className="auth-eyebrow">Member account</p>
        <h1 id="account-title">Welcome to JoyHeart.</h1>
        <p className="auth-intro">Your account is signed in. Profile setup and member discovery will become available as those protected features are implemented.</p>
        <dl className="account-summary">
          <div><dt>Email address</dt><dd>{email}</dd></div>
          <div><dt>Email verification</dt><dd>{verified ? "Verified" : "Not verified"}</dd></div>
        </dl>
        <p className="auth-switch"><a href="/">Return to JoyHeart home</a></p>
      </section>
    </main>
  );
}
