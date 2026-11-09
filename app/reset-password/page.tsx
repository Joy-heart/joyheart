import { ResetPasswordForm } from "@/app/components/auth/AuthForms";

export const metadata = {
  title: "Reset password",
  description: "Choose a new password for your JoyHeart account.",
};

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-title">
        <div className="auth-brand-lockup"><img src="/joyheart-mark.svg" alt="JoyHeart" width="60" height="60" /><span>JoyHeart</span></div>
        <p className="auth-eyebrow">Account recovery</p>
        <h1 id="reset-title">Choose a new password.</h1>
        <p className="auth-intro">Use at least 12 characters. Keep your password private.</p>
        <ResetPasswordForm />
        <p className="auth-switch"><a href="/login">Return to log in</a></p>
      </section>
    </main>
  );
}
