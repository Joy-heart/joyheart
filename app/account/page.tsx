import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileSetup from "@/app/components/profile/ProfileSetup";
import ProfileCompatibility from "@/app/components/profile/ProfileCompatibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { claims }, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.sub) redirect("/login?next=%2Faccount");

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?next=%2Faccount");
  if (!user.email_confirmed_at) redirect("/login?reason=verify&next=%2Faccount");

  // Public presentation columns are read under the normal profiles RLS policy.
  // Private matching/editor fields come from an owner-only RPC with no target id.
  const [profileResult, privateResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,country,city,bio,relationship_intention,interests")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("joyheart_get_own_profile_private_settings"),
  ]);

  if (profileResult.error || privateResult.error) {
    throw new Error("Your private profile settings could not be loaded safely.");
  }

  const privateSettings = Array.isArray(privateResult.data) ? privateResult.data[0] : privateResult.data;
  const initialProfile = profileResult.data && privateSettings
    ? { ...profileResult.data, ...privateSettings }
    : null;

  return <><ProfileSetup initialProfile={initialProfile} /><div className="profile-setup-page"><section className="profile-setup-shell"><ProfileCompatibility /></section></div></>;
}
