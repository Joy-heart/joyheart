"use client";
import { useEffect, useState } from "react";

type Consent = { necessary: true; analytics: boolean; marketing: boolean; savedAt: string };
const KEY = "joyheart-cookie-consent-v1";

export default function ConsentManager() {
  const [choice, setChoice] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Consent;
        if (parsed.necessary === true && typeof parsed.analytics === "boolean" && typeof parsed.marketing === "boolean") setChoice(parsed);
      }
    } catch { /* Invalid or blocked storage: show the consent controls again. */ }
  }, []);

  function save(next: Omit<Consent, "necessary" | "savedAt">) {
    const value: Consent = { necessary: true, ...next, savedAt: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* Keep the current-session choice usable. */ }
    setChoice(value);
    setOpen(false);
  }

  if (choice && !open) return <button className="jh-cookie-settings-link" type="button" onClick={() => { setAnalytics(choice.analytics); setMarketing(choice.marketing); setOpen(true); }}>Cookie settings</button>;

  return <aside className="jh-consent" aria-label="Cookie preferences">
    <div className="jh-consent-copy"><span className="jh-consent-eyebrow">Your privacy, your choice</span><h2>Cookies and your experience</h2><p>JoyHeart uses essential browser storage to keep the site and your choices working. Optional analytics and marketing storage are off unless you choose them. You can change your choice at any time.</p><a href="/cookies">Read our cookie policy</a></div>
    {open && <div className="jh-consent-options">
      <label><input type="checkbox" checked disabled /> Essential storage <small>Always active for site functionality.</small></label>
      <label><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /> Analytics <small>Allow optional usage measurement if enabled in future.</small></label>
      <label><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} /> Marketing <small>Allow optional marketing storage if enabled in future.</small></label>
    </div>}
    <div className="jh-consent-actions">
      {open ? <><button type="button" className="jh-consent-secondary" onClick={() => save({analytics:false,marketing:false})}>Reject optional</button><button type="button" className="jh-consent-primary" onClick={() => save({analytics,marketing})}>Save preferences</button></> : <><button type="button" className="jh-consent-secondary" onClick={() => save({analytics:false,marketing:false})}>Reject optional</button><button type="button" className="jh-consent-secondary" onClick={() => setOpen(true)}>Manage choices</button><button type="button" className="jh-consent-primary" onClick={() => save({analytics:true,marketing:true})}>Accept all</button></>}
    </div>
  </aside>;
}
