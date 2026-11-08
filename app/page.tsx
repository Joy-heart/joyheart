const values = [
  {
    icon: "♡",
    title: "Meaningful connections",
    description:
      "Discover people who share your values, hopes, and intention for a genuine relationship.",
  },
  {
    icon: "✧",
    title: "Trust comes first",
    description:
      "A thoughtful community experience designed with respect, privacy, and safer dating in mind.",
  },
  {
    icon: "⌘",
    title: "A world of possibility",
    description:
      "Meet beyond borders and make room for connections that can grow wherever life takes you.",
  },
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="JoyHeart home">
          <img
            className="brand-logo"
            src="/joyheart-mark.svg"
            alt=""
            width="42"
            height="42"
            aria-hidden="true"
          />
          <span>JoyHeart</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#our-approach">Our approach</a>
          <a href="#values">Why JoyHeart</a>
          <a href="#safety">Safety</a>
        </nav>

        <div className="nav-actions">
          <a className="button button-quiet" href="/login">
            Log in
          </a>
          <a className="button button-primary" href="/signup">
            Join JoyHeart
          </a>
        </div>
      </header>

      <section className="hero" id="our-approach">
        <div className="hero-copy">
          <p className="eyebrow">A more meaningful way to meet</p>
          <h1>
            Where hearts
            <br />
            find <span>happiness.</span>
          </h1>
          <p className="hero-description">
            Real connection begins with being seen, understood, and valued.
            Meet people with intention and make space for something meaningful.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/signup">
              Start your journey <span aria-hidden="true">→</span>
            </a>
            <a className="button button-quiet" href="#values">
              Discover JoyHeart
            </a>
          </div>
          <div className="trust-note" id="safety">
            <span className="trust-dot" aria-hidden="true" />
            Built around respect, trust, and genuine connection
          </div>
        </div>

        <div className="hero-art" aria-label="JoyHeart brand illustration">
          <div className="art-orbit" aria-hidden="true" />
          <div className="floating-note note-top">
            <span aria-hidden="true">✧</span>
            Connection with intention
          </div>
          <div className="heart-card">
            <div className="heart-symbol" aria-hidden="true">
              ♡
            </div>
            <strong>A little more heart.</strong>
            <p>Because the best connections start with being yourself.</p>
          </div>
          <div className="floating-note note-bottom">
            <span aria-hidden="true">⌖</span>
            Across the world
          </div>
        </div>
      </section>

      <section className="values" id="values">
        <div className="section-heading">
          <p>The JoyHeart difference</p>
          <h2>More than a match. A meaningful beginning.</h2>
        </div>

        <div className="value-grid">
          {values.map((value) => (
            <article className="value-card" key={value.title}>
              <div className="value-icon" aria-hidden="true">
                {value.icon}
              </div>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <strong>JoyHeart</strong> · Where Hearts Find Happiness.
      </footer>
    </main>
  );
}
