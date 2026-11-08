"use client";
import { FormEvent, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";
function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <p className={error ? "auth-message auth-message-error" : "auth-message"} role="status">{children}</p>;
}
export function SignupForm() {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [consent,setConsent]=useState(false); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage(""); setError(false);
    if(!supabase){setError(true);setMessage("Registration is temporarily unavailable. Please try again later.");return;}
    if(password.length<12){setError(true);setMessage("Please use a password with at least 12 characters.");return;}
    if(password!==confirm){setError(true);setMessage("The passwords do not match.");return;}
    if(!consent){setError(true);setMessage("Please confirm the age requirement and accept the Terms and Privacy Notice.");return;}
    setBusy(true);
    const redirectTo=window.location.origin+"/auth/callback?next=/";
    const {data,error:err}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirectTo,data:{display_name:name.trim()}}});
    setBusy(false);
    if(err){setError(true);setMessage(err.message);return;}
    setMessage(data.session ? "Your account was created. Please complete email verification before using JoyHeart." : "We sent a verification link to your email. Open it to confirm your account before signing in. Check your spam folder if it does not arrive.");
    setPassword("");setConfirm("");
  }
  return <form className="auth-form" aria-label="Create a JoyHeart account" onSubmit={submit}>
    <label htmlFor="signup-name">Your name</label><input id="signup-name" type="text" autoComplete="name" placeholder="How should we call you?" value={name} onChange={e=>setName(e.target.value)} required maxLength={80}/>
    <label htmlFor="signup-email">Email address</label><input id="signup-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
    <label htmlFor="signup-password">Create a password</label><input id="signup-password" type="password" autoComplete="new-password" placeholder="At least 12 characters" value={password} onChange={e=>setPassword(e.target.value)} required minLength={12}/>
    <label htmlFor="signup-confirm-password">Confirm password</label><input id="signup-confirm-password" type="password" autoComplete="new-password" placeholder="Enter your password again" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={12}/>
    <label className="auth-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I confirm that I am at least 18 years old (or older where local law requires) and agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Notice</a>.</span></label>
    <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy?"Creating your account…":"Create my account"}</button>
    {message&&<Notice error={error}>{message}</Notice>}
  </form>;
}
export function LoginForm() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setMessage("");setError(false);if(!supabase){setError(true);setMessage("Sign-in is temporarily unavailable.");return;}setBusy(true);const {error:err}=await supabase.auth.signInWithPassword({email:email.trim(),password});setBusy(false);if(err){setError(true);setMessage(err.message);return;}window.location.assign("/");}
  async function forgot(){setMessage("");setError(false);if(!email.trim()){setError(true);setMessage("Enter your email address first, then choose Forgot password.");return;}if(!supabase){setError(true);setMessage("Password recovery is temporarily unavailable.");return;}setBusy(true);const {error:err}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+"/reset-password"});setBusy(false);if(err){setError(true);setMessage(err.message);}else setMessage("If an account exists for that email, a recovery link has been sent. Check your inbox and spam folder.");}
  return <form className="auth-form" aria-label="Log in to JoyHeart" onSubmit={submit}>
    <label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
    <label htmlFor="login-password">Password</label><input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required/>
    <div className="auth-form-meta"><span className="auth-muted">Secure member access</span><button type="button" className="auth-text-button" onClick={forgot} disabled={busy}>Forgot password?</button></div>
    <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy?"Signing in…":"Log in"}</button>
    {message&&<Notice error={error}>{message}</Notice>}
  </form>;
}
export function ResetPasswordForm(){
  const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setMessage("");setError(false);if(!supabase){setError(true);setMessage("Password recovery is unavailable.");return;}if(password.length<12||password!==confirm){setError(true);setMessage(password.length<12?"Use at least 12 characters.":"The passwords do not match.");return;}setBusy(true);const {error:err}=await supabase.auth.updateUser({password});setBusy(false);if(err){setError(true);setMessage(err.message);}else{setMessage("Your password has been updated. You can now log in.");setPassword("");setConfirm("");}}
  return <form className="auth-form" onSubmit={submit}><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/><label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/><button className="button button-primary auth-submit" disabled={busy} type="submit">{busy?"Updating…":"Update password"}</button>{message&&<Notice error={error}>{message}</Notice>}</form>;
}

