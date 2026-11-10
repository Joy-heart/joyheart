import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import MemberReportForm from "@/app/components/safety/MemberReportForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ member?: string; conversation?: string; message?: string }>;

export default async function ReportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=%2Freport");

  return (
    <main className="member-area safety-report-page">
      <div className="member-heading">
        <div>
          <p className="safety-eyebrow">JoyHeart safety</p>
          <h1>Report a concern</h1>
          <p>Your report is private. Our team can review it and take appropriate action.</p>
        </div>
      </div>
      <MemberReportForm
        reportedMemberId={params.member ?? ""}
        conversationId={params.conversation ?? null}
        messageId={params.message ?? null}
      />
    </main>
  );
}
