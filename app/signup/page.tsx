export const metadata = {
  title: "Join JoyHeart",
  description: "Create your JoyHeart account.",
};

export default function SignupPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="JoyHeart home">
          <span className="brand-mark" aria-hidden="true">♡</span>
          <span>JoyHeart</span>
        </a>
        <a className="button button-quiet" href="/">Back to home</a>
      </header>
      <section className="values" aria-labelledby="signup-title">
        <div className="section-heading">
          <p>Begin something meaningful</p>
          <h1 id="signup-title">Join the JoyHeart community.</h1>
          <p>Registration is being prepared with privacy and account security at the centre. No account details are collected on this page yet.</p>
        </div>
      </section>
    </main>
  );
}
