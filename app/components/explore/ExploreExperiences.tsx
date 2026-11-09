"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

type Experience = {
  id: string;
  title: string;
  description: string;
  icon: string;
  group: "Dates" | "Getaways" | "Shared interests" | "Connection";
};

const experiences: Experience[] = [
  { id: "dinner-date", title: "Dinner dates", description: "Good food, thoughtful conversation and a table for two.", icon: "🍽️", group: "Dates" },
  { id: "coffee-date", title: "Coffee dates", description: "A relaxed first hello over coffee, tea or a favourite café.", icon: "☕", group: "Dates" },
  { id: "night-date", title: "Night dates", description: "Evening plans, city lights, live shows and special nights out.", icon: "🌙", group: "Dates" },
  { id: "movie-night", title: "Movie nights", description: "Find someone who enjoys films, cinema and cosy evenings.", icon: "🎬", group: "Dates" },
  { id: "food-and-cooking", title: "Food & cooking", description: "Explore restaurants, recipes, food markets and cooking together.", icon: "🥘", group: "Dates" },
  { id: "travel-companion", title: "Travel companions", description: "Meet people who love discovering new places and cultures.", icon: "✈️", group: "Getaways" },
  { id: "bnb-getaway", title: "BnB getaways", description: "Plan a safe, mutually agreed weekend escape or local stay.", icon: "🏡", group: "Getaways" },
  { id: "weekend-adventure", title: "Weekend adventures", description: "Day trips, nature walks, road trips and new experiences.", icon: "🧭", group: "Getaways" },
  { id: "gaming-partner", title: "Gaming partners", description: "Find a teammate for co-op games, esports or friendly matches.", icon: "🎮", group: "Shared interests" },
  { id: "creative-people", title: "Creative people", description: "Connect through photography, design, writing, music and ideas.", icon: "🎨", group: "Shared interests" },
  { id: "live-music", title: "Live music", description: "Concerts, festivals, gigs and discovering new artists.", icon: "🎵", group: "Shared interests" },
  { id: "art-and-culture", title: "Art & culture", description: "Museums, galleries, theatre, heritage and cultural events.", icon: "🖼️", group: "Shared interests" },
  { id: "fitness-outdoors", title: "Fitness & outdoors", description: "Running, hiking, cycling, gym sessions and active days.", icon: "🌿", group: "Shared interests" },
  { id: "books-and-learning", title: "Books & learning", description: "Readers, curious minds, language exchange and lifelong learning.", icon: "📚", group: "Shared interests" },
  { id: "sports-fans", title: "Sports fans", description: "Watch a game, support a team or play together.", icon: "⚽", group: "Shared interests" },
  { id: "friends-first", title: "Friendship first", description: "Start with conversation and shared interests without pressure.", icon: "🤝", group: "Connection" },
];

const groups = ["All", "Dates", "Getaways", "Shared interests", "Connection"] as const;

export default function ExploreExperiences({
  initialInterests,
  relationshipIntention,
  hasProfile,
}: {
  initialInterests: string[];
  relationshipIntention: string;
  hasProfile: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(initialInterests);
  const [activeGroup, setActiveGroup] = useState<(typeof groups)[number]>("All");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);

  const visible = useMemo(
    () => activeGroup === "All" ? experiences : experiences.filter((item) => item.group === activeGroup),
    [activeGroup],
  );

  function toggle(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : current.length >= 20 ? current : [...current, id]);
    setNotice("");
  }

  async function save() {
    setNotice("");
    setError(false);
    if (!supabase) {
      setError(true);
      setNotice("Explore preferences are temporarily unavailable.");
      return;
    }
    if (!hasProfile) {
      setError(true);
      setNotice("Please complete and save your member profile first.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user?.email_confirmed_at) throw new Error("Please sign in with your verified account.");
      const { error: saveError } = await supabase
        .from("profiles")
        .update({ explore_interests: selected })
        .eq("user_id", user.id);
      if (saveError) throw saveError;
      setNotice("Your Explore interests have been saved. You can change them any time.");
    } catch (cause) {
      setError(true);
      setNotice(cause instanceof Error && cause.message ? cause.message : "We could not save your Explore interests. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="explore-page">
      <section className="explore-shell">
        <div className="explore-hero">
          <p className="explore-eyebrow">JoyHeart · Explore</p>
          <h1>Meet through the things you love.</h1>
          <p className="explore-intro">Not every connection starts the same way. Choose the experiences you enjoy, discover people with shared interests and make plans at a pace that feels right.</p>
          <div className="explore-summary">
            <span>♡</span>
            <p><strong>Your relationship intention:</strong> {relationshipIntention || "Not selected yet"}<small>Relationship intention and date activities are separate, so you can choose both freely.</small></p>
          </div>
        </div>

        <div className="explore-section-heading">
          <div><h2>What would you enjoy?</h2><p>Choose up to 20 experiences. These choices help shape your future Explore recommendations.</p></div>
          <span className="explore-selection-count">{selected.length}/20 selected</span>
        </div>

        <div className="explore-filters" role="group" aria-label="Filter experiences">
          {groups.map((group) => <button type="button" key={group} className={activeGroup === group ? "active" : ""} onClick={() => setActiveGroup(group)}>{group}</button>)}
        </div>

        <div className="explore-grid">
          {visible.map((item) => {
            const active = selected.includes(item.id);
            return <button type="button" key={item.id} className={active ? "explore-card selected" : "explore-card"} aria-pressed={active} onClick={() => toggle(item.id)}>
              <span className="explore-card-icon" aria-hidden="true">{item.icon}</span>
              <span className="explore-card-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
              <span className="explore-card-check" aria-hidden="true">{active ? "✓" : "+"}</span>
            </button>;
          })}
        </div>

        <div className="explore-save-row">
          <p>Your choices are private to your account until you decide to share them.</p>
          <button type="button" className="button button-primary" onClick={save} disabled={saving || !hasProfile}>{saving ? "Saving…" : "Save my Explore interests"}</button>
        </div>
        {!hasProfile && <p className="explore-notice error" role="status">Complete your profile before saving Explore preferences.</p>}
        {notice && <p className={error ? "explore-notice error" : "explore-notice success"} role="status">{notice}</p>}

        <div className="explore-safety-note">
          <span aria-hidden="true">✧</span>
          <p><strong>Make every plan a safe plan.</strong> Meet in public for first dates, keep your own transport, tell someone you trust where you are going, and never feel pressured to share accommodation or travel plans.</p>
        </div>

        <p className="explore-coming-soon">Member recommendations and experience-based matching will open after profile publication, photo moderation and two-member matching checks are complete. No unreviewed member profiles are shown here.</p>
      </section>
    </main>
  );
}
