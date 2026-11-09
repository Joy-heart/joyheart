import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import ProfileSetup from "@/app/components/profile/ProfileSetup";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { claims }, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.sub) redirect("/login?next=%2Faccount");

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?next=%2Faccount");
  if (!user.email_confirmed_at) redirect("/login?reason=verify&next=%2Faccount");

  const { data } = await supabase
    .from("profiles")
    .select("display_name,country,city,bio,gender,seeking,relationship_intention,interests,publication_status")
    .eq("user_id", user.id)
    .maybeSingle();

  return <ProfileSetup initialProfile={data ?? null} />;
}
