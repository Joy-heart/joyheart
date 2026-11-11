import Link from "next/link";
export const metadata = { title: "Member area | JoyHeart", robots: { index: false, follow: false } };
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import DiscoveryFeed from "@/app/components/discover/DiscoveryFeed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DiscoverPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fdiscover");

  return <main className="member-area">
    <div className="member-heading">
      <div><p className="safety-eyebrow">Thoughtful connections</p><h1>Discover</h1><p>Meet people with intention, at your own pace.</p></div>
      <Link className="member-action secondary" href="/matches">Your matches</Link>
    </div>
    <DiscoveryFeed />
  </main>;
}
