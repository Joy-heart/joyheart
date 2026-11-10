const footerLinks = [
  { label: "Our approach", href: "/#our-approach" },
  { label: "Why JoyHeart", href: "/#values" },
  { label: "Safety", href: "/#safety" },
  { label: "Report a concern", href: "/report" },
  { label: "Log in", href: "/login" },
  { label: "Join JoyHeart", href: "/signup" },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a className="brand footer-brand-link" href="/" aria-label="JoyHeart home">
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
          <p>Where Hearts Find Happiness.</p>
          <p className="footer-promise">
            A more thoughtful way to meet, built around respect, trust, and
            genuine connection.
          </p>
        </div>

        <div className="footer-navigation">
          <h2>Explore</h2>
          <nav aria-label="Footer navigation">
            {footerLinks.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="footer-safety">
          <h2>Connection with care</h2>
          <p>
            Take your time, protect your personal information, and get to know
            people at a pace that feels right.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} JoyHeart. All rights reserved.</span>
        <span>Where Hearts Find Happiness.</span>
      </div>
    </footer>
  );
}
