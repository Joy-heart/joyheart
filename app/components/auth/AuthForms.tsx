"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

type NoticeProps = { children: React.ReactNode; error?: boolean };
function Notice({ children, error = false }: NoticeProps) {
  return <p className={error ? "auth-message auth-message-error" : "auth-message"} role={error ? "alert" : "status"}>{children}</p>;
}

function friendlyAuthError(message: string) {
  const value = message.toLowerCase();
  if (value.includes("invalid login credentials") || value.includes("invalid email or password")) return "The email address or password is incorrect. Please check them and try again.";
  if (value.includes("email not confirmed")) return "Please verify your email address before signing in. Check your inbox for the verification message.";
  if (value.includes("rate limit") || value.includes("too many requests")) return "There have been too many attempts. Please wait a little before trying again.";
  if (value.includes("password")) return "The password could not be accepted. Please review the password requirements and try again.";
  if (value.includes("network") || value.includes("fetch")) return "We could not reach the sign-in service. Check your connection and try again.";
  return "We could not complete that request. Please try again. If the problem continues, contact JoyHeart support.";
}

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError(false);
    if (!supabase) { setError(true); setMessage("Registration is temporarily unavailable. Please try again later."); return; }
    if (name.trim().length < 2 || name.trim().length > 80) { setError(true); setMessage("Enter a name between 2 and 80 characters."); return; }
    if (password.length < 12) { setError(true); setMessage("Please use a password with at least 12 characters."); return; }
    if (password !== confirm) { setError(true); setMessage("The passwords do not match."); return; }
    if (!consent) { setError(true); setMessage("Please confirm the age requirement and accept the Terms and Privacy Notice."); return; }
    setBusy(true);
    try {
      const redirectTo = new URL("/auth/callback?next=%2F", window.location.origin).toString();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: redirectTo, data: { display_name: name.trim() } },
      });
      if (authError) throw authError;
      setMessage(data.session
        ? "Your account was created. Please check your email to complete verification before using member features."
        : "We sent a verification link if this address is eligible. Open the email and follow its link to verify your account. Check your spam folder too.");
      setPassword("");
      setConfirm("");
    } catch (caught) {
      setError(true);
      setMessage(friendlyAuthError(caught instanceof Error ? caught.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" aria-label="Create a JoyHeart account" onSubmit={submit}>
      <label htmlFor="signup-name">Your name</label>
      <input id="signup-name" type="text" autoComplete="name" placeholder="How should we call you?" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
      <label htmlFor="signup-email">Email address</label>
      <input id="signup-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
      <label htmlFor="signup-password">Create a password</label>
      <input id="signup-password" type="password" autoComplete="new-password" placeholder="At least 12 characters" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} />
      <label htmlFor="signup-confirm-password">Confirm password</label>
      <input id="signup-confirm-password" type="password" autoComplete="new-password" placeholder="Enter your password again" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={12} maxLength={128} />
      <label className="auth-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I confirm that I am at least 18 years old (or older where local law requires) and agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Notice</a>.</span>
      </label>
      <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Creating your account…" : "Create my account"}</button>
      {message && <Notice error={error}>{message}</Notice>}
    </form>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError(false);
    if (!supabase) { setError(true); setMessage("Sign-in is temporarily unavailable."); return; }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (authError) throw authError;
      window.location.assign("/");
    } catch (caught) {
      setError(true);
      setMessage(friendlyAuthError(caught instanceof Error ? caught.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    setMessage("");
    setError(false);
    if (!email.trim()) { setError(true); setMessage("Enter your email address first, then choose Forgot password."); return; }
    if (!supabase) { setError(true); setMessage("Password recovery is temporarily unavailable."); return; }
    setBusy(true);
    try {
      const redirectTo = new URL("/auth/callback?next=%2Freset-password", window.location.origin).toString();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (authError) throw authError;
      setMessage("If an account exists for that address, a recovery email has been sent. Check your inbox and spam folder.");
    } catch (caught) {
      setError(true);
      setMessage(friendlyAuthError(caught instanceof Error ? caught.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" aria-label="Log in to JoyHeart" onSubmit={submit}>
      <label htmlFor="login-email">Email address</label>
      <input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
      <label htmlFor="login-password">Password</label>
      <input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <div className="auth-form-meta"><span className="auth-muted">Secure member access</span><button type="button" className="auth-text-button" onClick={forgotPassword} disabled={busy}>Forgot password?</button></div>
      <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Log in"}</button>
      {message && <Notice error={error}>{message}</Notice>}
    </form>
  );
}

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Checking your recovery link…");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!supabase) { setError(true); setMessage("Password recovery is temporarily unavailable."); return; }
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setError(false);
        setMessage("Your recovery link is valid. Choose a new password below.");
      }
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) { setError(true); setMessage("We could not verify this recovery session. Request a new password-reset email."); return; }
      if (data.session) {
        setReady(true);
        setError(false);
        setMessage("Your recovery session is ready. Choose a new password below.");
        return;
      }
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      if (hash.get("error") || query.get("error")) {
        setError(true);
        setMessage("This recovery link is invalid or has expired. Request a new password-reset email.");
      } else {
        setError(true);
        setMessage("Open the password-reset link from your email on this device. When it expires, request a new one.");
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    if (!supabase || !ready) { setError(true); setMessage("A valid password-reset link is required before changing your password."); return; }
    if (password.length < 12 || password !== confirm) { setError(true); setMessage(password.length < 12 ? "Use at least 12 characters." : "The passwords do not match."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirm("");
      setReady(false);
      setMessage("Your password has been updated. Please log in with your new password.");
      await supabase.auth.signOut();
    } catch (caught) {
      setError(true);
      setMessage(friendlyAuthError(caught instanceof Error ? caught.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {message && <Notice error={error}>{message}</Notice>}
      {ready && <>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
        <label htmlFor="confirm-new-password">Confirm new password</label>
        <input id="confirm-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        <button className="button button-primary auth-submit" disabled={busy} type="submit">{busy ? "Updating…" : "Update password"}</button>
      </>}
      {!ready && <p className="auth-switch"><a href="/login">Return to log in to request a new link</a></p>}
    </form>
  );
}
