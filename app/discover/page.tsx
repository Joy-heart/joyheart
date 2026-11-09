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
    <section className="member-panel">
      <div className="member-empty">
        <div className="empty-mark">♡</div>
        <h2>Discover is getting ready</h2>
        <p>We are completing member eligibility, profile publication, photo moderation and two-member matching checks before showing real people. Your safety comes first.</p>
        <Link className="member-action" href="/explore">Explore experiences</Link>
        <p className="explore-coming-soon">You can choose the dates, activities and shared interests you enjoy while we finish safe member recommendations. No unreviewed profiles are shown.</p>
      </div>
    </section>
  </main>;
}
