export const metadata = {
  title: "Join JoyHeart",
  description: "Create your JoyHeart account and begin discovering meaningful connections.",
};

export default function SignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <div className="auth-brand-lockup">
          <img src="/joyheart-mark.svg" alt="JoyHeart" width="60" height="60" />
          <span>JoyHeart</span>
        </div>
        <p className="auth-eyebrow">Begin something meaningful</p>
        <h1 id="signup-title">Create your account</h1>
        <p className="auth-intro">
          Join a community built around genuine connections, respect, and meaningful relationships.
        </p>

        <div className="auth-preview-notice" role="status">
          <strong>Registration preview</strong>
          <span>Account creation is not open yet. These fields are a design preview and do not collect or send information.</span>
        </div>

        <form className="auth-form" aria-label="Registration form preview">
          <label htmlFor="signup-name">Your name</label>
          <input id="signup-name" type="text" placeholder="How should we call you?" disabled />

          <label htmlFor="signup-email">Email address</label>
          <input id="signup-email" type="email" placeholder="you@example.com" disabled />

          <label htmlFor="signup-password">Create a password</label>
          <input id="signup-password" type="password" placeholder="At least 12 characters" disabled />

          <label htmlFor="signup-confirm-password">Confirm password</label>
          <input id="signup-confirm-password" type="password" placeholder="Enter your password again" disabled />

          <label className="auth-consent">
            <input type="checkbox" disabled />
            <span>I confirm that I meet the age requirement and agree to the applicable terms and privacy notice.</span>
          </label>

          <button className="button button-primary auth-submit" type="button" disabled>
            Registration coming soon
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <a href="/login">Log in</a>
        </p>
        <p className="auth-footnote">Your privacy and safety matter. We will never ask you to share your password with anyone.</p>
      </section>
    </main>
  );
}
