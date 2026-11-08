export const metadata = {
  title: "Join JoyHeart",
  description: "Create your JoyHeart account.",
};

export default function SignupPage() {
  return (
    <main className="site-shell">
      <section className="values" aria-labelledby="signup-title">
        <div className="section-heading">
          <p>Begin something meaningful</p>
          <h1 id="signup-title">Join the JoyHeart community.</h1>
          <p>
            Registration is being prepared with privacy and account security at
            the centre. No account details are collected on this page yet.
          </p>
          <a className="button button-quiet" href="/login">
            Already have an account? Log in
          </a>
        </div>
      </section>
    </main>
  );
}
