import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { claims }, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims?.sub) {
    redirect("/login?next=%2Faccount");
  }

  // getUser() verifies with the Auth server and supplies the authoritative
  // email-confirmation state; never use user_metadata for authorization.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login?next=%2Faccount");
  }

  const verified = Boolean(user.email_confirmed_at);
  if (!verified) redirect("/login?reason=verify&next=%2Faccount");

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="account-title">
        <div className="auth-brand-lockup"><img src="/joyheart-mark.svg" alt="JoyHeart" width="60" height="60" /><span>JoyHeart</span></div>
        <p className="auth-eyebrow">Member account</p>
        <h1 id="account-title">Welcome to JoyHeart.</h1>
        <p className="auth-intro">Your account is signed in and your email address is verified.</p>
        <dl className="account-summary">
          <div><dt>Email address</dt><dd>{user.email ?? "Not available"}</dd></div>
          <div><dt>Email verification</dt><dd>{verified ? "Verified" : "Not verified"}</dd></div>
        </dl>
        <p className="auth-switch"><a href="/">Return to JoyHeart home</a></p>
      </section>
    </main>
  );
}
