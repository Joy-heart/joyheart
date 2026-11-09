"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

type Preferences = {
  preferred_age_min: number;
  preferred_age_max: number;
  preferred_countries: string[];
  preferred_languages: string[];
  relationship_intentions: string[];
  discovery_enabled: boolean;
};

const intentions = ["Long-term relationship", "Serious relationship", "Marriage-minded", "Life partner", "Friendship first", "Casual dating"];
const questions = [
  { key: "communication", title: "How do you prefer to communicate?", options: ["A thoughtful conversation", "A little message throughout the day", "Phone or video calls", "A balance of all three"] },
  { key: "weekend", title: "What does your ideal weekend look like?", options: ["Quiet time and recharging", "Exploring somewhere new", "Friends, family and social time", "Outdoor activities and adventure"] },
  { key: "conflict", title: "When something is bothering you, what helps most?", options: ["Talk it through calmly", "Take a little time, then talk", "Write down how I feel", "Listen first and understand each other"] },
  { key: "values", title: "Which qualities matter most in a relationship?", options: ["Trust and honesty", "Kindness and respect", "Shared goals and commitment", "Humour and friendship"] },
  { key: "affection", title: "How do you most naturally show affection?", options: ["Words and encouragement", "Time and attention", "Helpful actions", "Thoughtful gestures and touch"] },
  { key: "pace", title: "What pace feels right when getting to know someone?", options: ["Slow and intentional", "Steady with regular communication", "Open to seeing how it develops"] },
];

function splitList(value: string) {
  return [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))].slice(0, 30);
}

export default function ProfileCompatibility() {
  const [preferences, setPreferences] = useState<Preferences>({
    preferred_age_min: 18, preferred_age_max: 99, preferred_countries: [],
    preferred_languages: [], relationship_intentions: [], discovery_enabled: true,
  });
  const [countries, setCountries] = useState("");
  const [languages, setLanguages] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { if (active) setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) { setLoading(false); return; }
      const [prefResult, answerResult] = await Promise.all([
        supabase.from("member_discovery_preferences").select("preferred_age_min,preferred_age_max,preferred_countries,preferred_languages,relationship_intentions,discovery_enabled").eq("user_id", user.id).maybeSingle(),
        supabase.from("member_personality_answers").select("answers").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      if (prefResult.data) {
        const p = prefResult.data as Preferences;
        setPreferences(p);
        setCountries(p.preferred_countries.join(", "));
        setLanguages(p.preferred_languages.join(", "));
      }
      if (answerResult.data?.answers && typeof answerResult.data.answers === "object") setAnswers(answerResult.data.answers as Record<string, string>);
      if (prefResult.error || answerResult.error) { setError(true); setNotice("We couldn't load all your private settings. You can retry by refreshing this page."); }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  function toggleIntention(value: string) {
    setPreferences((current) => ({
      ...current,
      relationship_intentions: current.relationship_intentions.includes(value)
        ? current.relationship_intentions.filter((item) => item !== value)
        : [...current.relationship_intentions, value],
    }));
  }

  async function save() {
    if (!supabase || saving) return;
    setSaving(true); setNotice(""); setError(false);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user?.email_confirmed_at) throw new Error("Please verify your email and sign in again.");
      const next = { ...preferences, preferred_countries: splitList(countries), preferred_languages: splitList(languages) };
      if (next.preferred_age_min < 18 || next.preferred_age_max > 120 || next.preferred_age_min > next.preferred_age_max) throw new Error("Choose a valid age range. The minimum age is 18.");
      const [p, a] = await Promise.all([
        supabase.from("member_discovery_preferences").upsert({ user_id: user.id, ...next }, { onConflict: "user_id" }),
        supabase.from("member_personality_answers").upsert({ user_id: user.id, answers }, { onConflict: "user_id" }),
      ]);
      if (p.error) throw p.error;
      if (a.error) throw a.error;
      setNotice("Your personality answers and discovery preferences have been saved privately.");
    } catch (e) {
      setError(true);
      setNotice(e instanceof Error ? e.message : "We couldn't save your settings. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <section className="profile-compatibility">
      <header className="profile-compatibility-heading">
        <p className="profile-setup-eyebrow">Your compatibility</p>
        <h2>Help us understand what feels right to you.</h2>
        <p>These answers help guide better matches. Your detailed answers and filters are private to your account.</p>
      </header>
      {loading ? <p className="profile-field-hint">Loading your private settings…</p> : (
        <>
          <div className="profile-form-section">
            <div className="profile-section-title"><span>06</span><div><h2>Personality and connection</h2><p>There are no right or wrong answers. Choose what feels most like you.</p></div></div>
            <div className="profile-personality-list">
              {questions.map((question, index) => (
                <fieldset className="profile-personality-question" key={question.key}>
                  <legend>{index + 1}. {question.title}</legend>
                  <div className="profile-intention-options">
                    {question.options.map((option) => (
                      <label className={answers[question.key] === option ? "profile-choice selected" : "profile-choice"} key={option}>
                        <input type="radio" name={question.key} value={option} checked={answers[question.key] === option} onChange={() => setAnswers((current) => ({ ...current, [question.key]: option }))} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>
          <div className="profile-form-section">
            <div className="profile-section-title"><span>07</span><div><h2>Your discovery preferences</h2><p>Set the kind of people and places you'd like to discover.</p></div></div>
            <div className="profile-form-grid">
              <div><label htmlFor="pref-age-min">Minimum age</label><input id="pref-age-min" type="number" min="18" max="120" value={preferences.preferred_age_min} onChange={(e) => setPreferences((p) => ({ ...p, preferred_age_min: Number(e.target.value) }))} /></div>
              <div><label htmlFor="pref-age-max">Maximum age</label><input id="pref-age-max" type="number" min="18" max="120" value={preferences.preferred_age_max} onChange={(e) => setPreferences((p) => ({ ...p, preferred_age_max: Number(e.target.value) }))} /></div>
            </div>
            <label htmlFor="pref-countries">Preferred countries <small>Optional, comma separated</small></label>
            <input id="pref-countries" value={countries} onChange={(e) => setCountries(e.target.value)} maxLength={600} placeholder="Kenya, Uganda, United Kingdom" />
            <label htmlFor="pref-languages">Languages you'd like to share <small>Optional, comma separated</small></label>
            <input id="pref-languages" value={languages} onChange={(e) => setLanguages(e.target.value)} maxLength={400} placeholder="English, Swahili, French" />
            <p className="profile-field-hint">These preferences are private and do not reveal your location or contact details.</p>
            <label className="profile-visibility-toggle"><input type="checkbox" checked={preferences.discovery_enabled} onChange={(e) => setPreferences((p) => ({ ...p, discovery_enabled: e.target.checked }))} /><span><strong>Allow my profile to appear in discovery</strong><small>Turn this off whenever you want to pause discovery.</small></span></label>
            <h3 className="profile-preference-subtitle">Relationship intentions you'd like to meet</h3>
            <div className="profile-intention-options">
              {intentions.map((value) => <label className={preferences.relationship_intentions.includes(value) ? "profile-choice selected" : "profile-choice"} key={value}><input type="checkbox" checked={preferences.relationship_intentions.includes(value)} onChange={() => toggleIntention(value)} /><span>{value}</span></label>)}
            </div>
          </div>
          <button className="button button-primary profile-save-button" type="button" onClick={save} disabled={saving}>{saving ? "Saving your settings…" : "Save compatibility settings"}</button>
          {notice && <p className={error ? "profile-form-notice error" : "profile-form-notice success"} role="status">{notice}</p>}
        </>
      )}
    </section>
  );
}
