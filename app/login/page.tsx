export const metadata = {
  title: "Log in",
  description: "Log in to your JoyHeart account.",
};

export default function LoginPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="JoyHeart home">
          <span className="brand-mark" aria-hidden="true">♡</span>
          <span>JoyHeart</span>
        </a>
        <a className="button button-quiet" href="/">Back to home</a>
      </header>
      <section className="values" aria-labelledby="login-title">
        <div className="section-heading">
          <p>Welcome back</p>
          <h1 id="login-title">Your JoyHeart journey awaits.</h1>
          <p>Account sign-in is being connected securely. This page is not accepting credentials yet.</p>
        </div>
      </section>
    </main>
  );
}
