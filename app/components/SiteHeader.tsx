const navigation = [
  { label: "Our approach", href: "/#our-approach" },
  { label: "Why JoyHeart", href: "/#values" },
  { label: "Safety", href: "/#safety" },
];

export default function SiteHeader() {
  return (
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
        {navigation.map((item) => (
          <a href={item.href} key={item.label}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="nav-actions">
        <a className="button button-quiet" href="/login">
          Log in
        </a>
        <a className="button button-primary" href="/signup">
          Join JoyHeart
        </a>
      </div>

      <details className="mobile-nav">
        <summary aria-label="Open navigation menu">
          <span aria-hidden="true">☰</span>
        </summary>
        <nav className="mobile-nav-panel" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <a href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
          <a href="/login">Log in</a>
          <a href="/signup">Join JoyHeart</a>
        </nav>
      </details>
    </header>
  );
}
