import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ExploreExperiences from "@/app/components/explore/ExploreExperiences";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExplorePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fexplore");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("explore_interests,relationship_intention")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return <main className="explore-page"><section className="explore-shell"><p className="explore-eyebrow">JoyHeart experiences</p><h1>Explore what brings people together.</h1><p className="explore-intro">Your Explore preferences are being prepared. Please try again shortly.</p></section></main>;
  }

  return <ExploreExperiences
    initialInterests={profile?.explore_interests ?? []}
    relationshipIntention={profile?.relationship_intention ?? ""}
    hasProfile={Boolean(profile)}
  />;
}
