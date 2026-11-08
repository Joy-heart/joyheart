export const metadata = {
  title: "Log in",
  description: "Log in to your JoyHeart account.",
};

export default function LoginPage() {
  return (
    <main className="site-shell">
      <section className="values" aria-labelledby="login-title">
        <div className="section-heading">
          <p>Welcome back</p>
          <h1 id="login-title">Your JoyHeart journey awaits.</h1>
          <p>
            Account sign-in is being connected securely. This page is not
            accepting credentials yet.
          </p>
          <a className="button button-primary" href="/signup">
            Join JoyHeart
          </a>
        </div>
      </section>
    </main>
  );
}
