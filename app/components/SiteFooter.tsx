const footerGroups = [
  { title: "Company", links: [{ label: "About us", href: "/about" }, { label: "Our mission", href: "/about/mission" }, { label: "How it works", href: "/how-it-works" }, { label: "Success stories", href: "/success-stories" }] },
  { title: "Explore", links: [{ label: "Discover", href: "/how-it-works#discovery" }, { label: "Membership", href: "/membership" }, { label: "Premium features", href: "/premium" }, { label: "Blog", href: "/blog" }] },
  { title: "Support", links: [{ label: "Help centre", href: "/help" }, { label: "FAQ", href: "/faq" }, { label: "Contact", href: "/contact" }, { label: "Safety centre", href: "/safety" }, { label: "Report a concern", href: "/report" }] },
  { title: "Legal", links: [{ label: "Privacy policy", href: "/privacy-policy" }, { label: "Terms of service", href: "/terms" }, { label: "Cookie policy", href: "/cookies" }, { label: "Community guidelines", href: "/community-guidelines" }, { label: "Account deletion", href: "/account-deletion" }] },
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

        {footerGroups.map((group) => <div className="footer-navigation" key={group.title}>
          <h2>{group.title}</h2>
          <nav aria-label={group.title}>
            {group.links.map((item) => <a href={item.href} key={item.label}>{item.label}</a>)}
          </nav>
        </div>)}
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} JoyHeart. All rights reserved.</span>
        <span>For adults aged 18 and over · Where Hearts Find Happiness.</span>
      </div>
    </footer>
  );
}
