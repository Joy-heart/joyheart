"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";
import ProfilePhotoUpload from "@/app/components/profile/ProfilePhotoUpload";

type Profile = {
  display_name: string;
  country_code: string;
  city: string | null;
  about_me: string | null;
  relationship_intention: string;
  interests: string[];
  publication_status: string;
};

const countries = [
  ["KE", "Kenya"], ["UG", "Uganda"], ["TZ", "Tanzania"], ["RW", "Rwanda"], ["NG", "Nigeria"],
  ["GH", "Ghana"], ["ZA", "South Africa"], ["ET", "Ethiopia"], ["US", "United States"],
  ["GB", "United Kingdom"], ["CA", "Canada"], ["AU", "Australia"], ["NZ", "New Zealand"],
  ["IE", "Ireland"], ["DE", "Germany"], ["FR", "France"], ["NL", "Netherlands"],
  ["SE", "Sweden"], ["NO", "Norway"], ["CH", "Switzerland"], ["AE", "United Arab Emirates"],
  ["SA", "Saudi Arabia"], ["IN", "India"], ["PK", "Pakistan"], ["PH", "Philippines"],
  ["BR", "Brazil"], ["MX", "Mexico"], ["JP", "Japan"], ["SG", "Singapore"],
] as const;

const intentionOptions = [
  "Long-term relationship",
  "Marriage-minded",
  "Life partner",
  "Friendship first",
];

const interestOptions = [
  "Travel", "Music", "Faith", "Family", "Cooking", "Fitness", "Reading",
  "Nature", "Movies", "Business", "Art", "Learning", "Volunteering", "Sports",
  "Culture", "Adventure",
];

export default function ProfileSetup({ initialProfile }: { initialProfile: Profile | null }) {
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [countryCode, setCountryCode] = useState(initialProfile?.country_code ?? "");
  const [city, setCity] = useState(initialProfile?.city ?? "");
  const [aboutMe, setAboutMe] = useState(initialProfile?.about_me ?? "");
  const [intention, setIntention] = useState(initialProfile?.relationship_intention ?? "");
  const [interests, setInterests] = useState<string[]>(initialProfile?.interests ?? []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const [savedStatus, setSavedStatus] = useState(initialProfile?.publication_status ?? "draft");
  const [profileSaved, setProfileSaved] = useState(Boolean(initialProfile));

  const selectedCountry = useMemo(
    () => countries.find(([code]) => code === countryCode)?.[1] ?? "",
    [countryCode],
  );

  function toggleInterest(value: string) {
    setInterests((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length >= 20 ? current : [...current, value],
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setFailed(false);

    if (!supabase) {
      setFailed(true);
      setNotice("Profile saving is temporarily unavailable. Please try again later.");
      return;
    }
    if (displayName.trim().length < 2 || displayName.trim().length > 40) {
      setFailed(true);
      setNotice("Your display name must be between 2 and 40 characters.");
      return;
    }
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      setFailed(true);
      setNotice("Please choose your country.");
      return;
    }
    if (!intention) {
      setFailed(true);
      setNotice("Please choose what kind of connection you are looking for.");
      return;
    }

    setBusy(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email_confirmed_at) {
        throw new Error("Please verify your email and sign in again.");
      }

      const { error: saveError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          display_name: displayName.trim(),
          country_code: countryCode,
          city: city.trim() || null,
          about_me: aboutMe.trim() || null,
          relationship_intention: intention,
          interests,
        }, { onConflict: "user_id" });

      if (saveError) throw saveError;
      setSavedStatus("draft");
      setProfileSaved(true);
      setNotice("Your profile details have been saved as a private draft. You can review them before publishing.");
    } catch (error) {
      setFailed(true);
      const message = error instanceof Error ? error.message : "";
      setNotice(message.includes("profiles")
        ? "The profile service is not ready yet. The profile database migration must be reviewed and applied before saving."
        : message || "We could not save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="profile-setup-page">
      <section className="profile-setup-shell" aria-labelledby="profile-setup-title">
        <div className="profile-setup-heading">
          <p className="profile-setup-eyebrow">Your JoyHeart profile</p>
          <h1 id="profile-setup-title">Let people meet the real you.</h1>
          <p>Share a little about yourself and the kind of connection you hope to find. You control what appears on your profile.</p>
        </div>

        <div className="profile-privacy-note">
          <span aria-hidden="true">♡</span>
          <p><strong>Your privacy matters.</strong> Your exact date of birth, email address and private account details are never shown on your member profile.</p>
        </div>

        <form className="profile-setup-form" onSubmit={save}>
          <div className="profile-form-section">
            <div className="profile-section-title"><span>01</span><div><h2>Basic details</h2><p>Choose how other members will know you.</p></div></div>
            <label htmlFor="profile-display-name">Display name <em>Required</em></label>
            <input id="profile-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={40} required placeholder="Your first name or chosen name" />
            <div className="profile-form-grid">
              <div>
                <label htmlFor="profile-country">Country <em>Required</em></label>
                <select id="profile-country" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} required>
                  <option value="">Choose your country</option>
                  {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="profile-city">City <small>Optional</small></label>
                <input id="profile-city" value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} placeholder="Your city" />
              </div>
            </div>
            {selectedCountry && <p className="profile-field-hint">Country selected: {selectedCountry}. Your exact address is never requested.</p>}
          </div>

          <div className="profile-form-section">
            <div className="profile-section-title"><span>02</span><div><h2>What are you looking for?</h2><p>Choose the intention that feels right for you.</p></div></div>
            <div className="profile-intention-options">
              {intentionOptions.map((option) => (
                <label className={intention === option ? "profile-choice selected" : "profile-choice"} key={option}>
                  <input type="radio" name="relationship-intention" value={option} checked={intention === option} onChange={() => setIntention(option)} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="profile-form-section">
            <div className="profile-section-title"><span>03</span><div><h2>Your interests</h2><p>Select up to 20 things you enjoy.</p></div></div>
            <div className="profile-interest-list">
              {interestOptions.map((interest) => (
                <label className={interests.includes(interest) ? "profile-interest selected" : "profile-interest"} key={interest}>
                  <input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
            <p className="profile-field-hint">{interests.length} of 20 selected</p>
          </div>

          <div className="profile-form-section">
            <div className="profile-section-title"><span>04</span><div><h2>Introduce yourself</h2><p>A few genuine words help start a conversation.</p></div></div>
            <label htmlFor="profile-about">About me <small>Optional</small></label>
            <textarea id="profile-about" value={aboutMe} onChange={(event) => setAboutMe(event.target.value)} maxLength={500} rows={5} placeholder="What do you enjoy? What matters most to you? What would you like someone to know?" />
            <p className="profile-field-hint">{aboutMe.length} of 500 characters</p>
          </div>

          <ProfilePhotoUpload profileReady={profileSaved} />

          {notice && <p className={failed ? "profile-form-notice error" : "profile-form-notice success"} role="status">{notice}</p>}
          <button className="button button-primary profile-save-button" type="submit" disabled={busy}>
            {busy ? "Saving your profile…" : "Save profile details"}
          </button>
          <p className="profile-draft-note">Your profile stays a draft. Saving does not publish it or make it visible in discovery.</p>
          {savedStatus === "published" && <p className="profile-draft-note">Your current profile is published. Saving changes here does not change its publication status.</p>}
        </form>
      </section>
    </main>
  );
}
