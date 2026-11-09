"use client";

import { useEffect, useState } from "react";
import ExploreExperiences from "@/app/components/explore/ExploreExperiences";
import { supabase } from "@/app/lib/supabase/client";

type ExploreProfile = {
  explore_interests: string[];
  relationship_intention: string;
};

export default function ExplorePage() {
  const [profile, setProfile] = useState<ExploreProfile | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadExplore() {
      setLoading(true);
      setMessage("");

      if (!supabase) {
        if (active) {
          setMessage("Explore is temporarily unavailable. Please try again shortly.");
          setLoading(false);
        }
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        // A visitor without a session should be sent to login, not shown a
        // profile-loading error. Supabase reports a missing session as an
        // AuthSessionMissingError with user === null.
        if (!user && (!authError || authError.name === "AuthSessionMissingError")) {
          window.location.replace("/login?next=%2Fexplore");
          return;
        }

        // Preserve genuine authentication/network failures for the error UI.
        if (authError) throw authError;

        if (!user) {
          window.location.replace("/login?next=%2Fexplore");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("explore_interests,relationship_intention")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          setHasProfile(Boolean(data));
          setProfile(data
            ? {
                explore_interests: Array.isArray(data.explore_interests)
                  ? data.explore_interests.filter((value): value is string => typeof value === "string")
                  : [],
                relationship_intention: data.relationship_intention ?? "",
              }
            : null);
        }
      } catch {
        if (active) {
          setMessage("We couldn't load your Explore preferences. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadExplore();

    return () => {
      active = false;
    };
  }, [attempt]);

  if (loading) {
    return (
      <main className="explore-page">
        <section className="explore-shell" aria-live="polite">
          <p className="explore-eyebrow">JoyHeart · Explore</p>
          <h1>Preparing your experiences…</h1>
          <p className="explore-intro">We’re securely loading your saved preferences.</p>
        </section>
      </main>
    );
  }

  if (message) {
    return (
      <main className="explore-page">
        <section className="explore-shell" aria-live="polite">
          <p className="explore-eyebrow">JoyHeart · Explore</p>
          <h1>Explore is taking a little longer.</h1>
          <p className="explore-intro">{message}</p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <ExploreExperiences
      initialInterests={profile?.explore_interests ?? []}
      relationshipIntention={profile?.relationship_intention ?? ""}
      hasProfile={hasProfile}
    />
  );
}
