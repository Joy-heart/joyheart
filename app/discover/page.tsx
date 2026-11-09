import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DiscoverPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fdiscover");

  return <main className="member-area">
    <div className="member-heading"><div><h1>Discover</h1><p>Meet people with intention, at your own pace.</p></div><Link className="member-action secondary" href="/matches">Your matches</Link></div>
    <section className="member-panel"><div className="member-empty"><div className="empty-mark">♡</div><h2>A safer way to discover is being prepared</h2><p>We are finishing profile eligibility checks, member preferences, photo approval and privacy controls before showing anyone. This protects you and every JoyHeart member.</p><span className="member-alert">Discovery is not open yet. No unreviewed profiles are being shown.</span></div></section>
  </main>;
}
