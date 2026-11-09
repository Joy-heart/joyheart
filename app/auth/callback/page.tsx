"use client";

import { useEffect, useState } from "react";
import { ResetPasswordForm } from "@/app/components/auth/AuthForms";
import { supabase } from "@/app/lib/supabase/client";

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.origin === window.location.origin ? parsed.pathname + parsed.search + parsed.hash : "/";
  } catch {
    return "/";
  }
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Confirming your email address…");
  const [failed, setFailed] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let active = true;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    async function complete() {
      if (!supabase) {
        if (active) { setFailed(true); setMessage("Authentication is temporarily unavailable. Please try again later."); }
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = safeInternalPath(params.get("next"));
      const providerError = params.get("error_description") || params.get("error");
      if (providerError) {
        if (active) { setFailed(true); setMessage("This verification or recovery link is invalid or has expired. Request a fresh email and try again."); }
        return;
      }
      if (!code) {
        if (active) { setFailed(true); setMessage("This link is incomplete or has expired. Request a fresh verification or recovery email."); }
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;
      if (exchangeError) {
        setFailed(true);
        setMessage("We could not verify this link. It may have expired or already been used. Request a fresh email and try again.");
        return;
      }
      if (next === "/reset-password") {
        setMessage("Your recovery link is verified. Choose a new password below.");
        setRecoveryReady(true);
        return;
      }
      setMessage("Your email is verified. Your JoyHeart account is ready.");
      redirectTimer = window.setTimeout(() => window.location.replace(next), 900);
    }

    void complete();
    return () => {
      active = false;
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-live="polite">
        <div className="auth-brand-lockup"><img src="/joyheart-mark.svg" alt="JoyHeart" width="60" height="60" /><span>JoyHeart</span></div>
        <p className="auth-eyebrow">{recoveryReady ? "Account recovery" : failed ? "Account link" : "Email verification"}</p>
        <h1>{recoveryReady ? "Choose a new password." : failed ? "Verification needs attention." : "One more step."}</h1>
        <p className="auth-intro">{message}</p>
        {recoveryReady && <ResetPasswordForm recoveryVerified />}
        {failed && <p className="auth-switch"><a href="/signup">Return to registration</a> or <a href="/login">log in</a>.</p>}
      </section>
    </main>
  );
}
