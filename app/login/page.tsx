export const metadata = {
  title: "Log in",
  description: "Log in to your JoyHeart account.",
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand-lockup">
          <img src="/joyheart-mark.svg" alt="JoyHeart" width="60" height="60" />
          <span>JoyHeart</span>
        </div>
        <p className="auth-eyebrow">Welcome back</p>
        <h1 id="login-title">Good to see you again.</h1>
        <p className="auth-intro">
          Sign in to continue your JoyHeart journey and the connections that matter.
        </p>

        <div className="auth-preview-notice" role="status">
          <strong>Sign-in preview</strong>
          <span>Member sign-in is not connected yet. These fields are disabled and do not collect or send information.</span>
        </div>

        <form className="auth-form" aria-label="Login form preview">
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" type="email" placeholder="you@example.com" disabled />

          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" placeholder="Enter your password" disabled />

          <div className="auth-form-meta">
            <span className="auth-muted">Secure member access</span>
            <span aria-disabled="true" className="auth-disabled-link">Forgot password?</span>
          </div>

          <button className="button button-primary auth-submit" type="button" disabled>
            Sign-in coming soon
          </button>
        </form>

        <p className="auth-switch">
          New to JoyHeart? <a href="/signup">Create an account</a>
        </p>
        <p className="auth-footnote">Never share your password or verification codes with another person.</p>
      </section>
    </main>
  );
}
