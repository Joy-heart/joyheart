"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

const navigation = [
  { label: "Our approach", href: "/#our-approach" },
  { label: "Why JoyHeart", href: "/#values" },
  { label: "Safety", href: "/#safety" },
];

export default function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) { setSignedIn(Boolean(data.session)); setReady(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setSignedIn(Boolean(session)); setReady(true); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  const memberLinks = signedIn
    ? <><a href="/account">My account</a><button className="nav-logout" type="button" onClick={logout}>Log out</button></>
    : <><a href="/login">Log in</a><a className="button button-primary" href="/signup">Join JoyHeart</a></>;

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="JoyHeart home">
        <img className="brand-logo" src="/joyheart-mark.svg" alt="" width="42" height="42" aria-hidden="true" />
        <span>JoyHeart</span>
      </a>
      <nav className="nav-links" aria-label="Main navigation">
        {navigation.map((item) => <a href={item.href} key={item.label}>{item.label}</a>)}
      </nav>
      <div className="nav-actions" aria-live="polite">
        {!ready ? <span className="auth-muted"> </span> : memberLinks}
      </div>
      <details className="mobile-nav">
        <summary aria-label="Open navigation menu"><span aria-hidden="true">☰</span></summary>
        <nav className="mobile-nav-panel" aria-label="Mobile navigation">
          {navigation.map((item) => <a href={item.href} key={item.label}>{item.label}</a>)}
          {!ready ? null : memberLinks}
        </nav>
      </details>
    </header>
  );
}
