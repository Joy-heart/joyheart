import Link from "next/link";

const benefits = [
  { icon: "♡", title: "Meaningful connections", description: "Discover people who share your values, hopes and intention for a genuine relationship." },
  { icon: "✧", title: "Thoughtful preferences", description: "Build your profile, share your interests and set preferences that reflect what matters to you." },
  { icon: "⌘", title: "An international outlook", description: "Make room for connections across countries and backgrounds, at a pace that feels right." },
  { icon: "◇", title: "Privacy with choice", description: "Manage your profile details and choose how you participate in the member experience." },
  { icon: "◎", title: "Communication", description: "When a mutual connection is made, continue the conversation through the platform's messaging experience." },
  { icon: "♡", title: "Respectful community", description: "Use member safety tools and community guidance to help maintain respectful interactions." },
];
const steps = [
  { number: "01", title: "Create your profile", body: "Start with the basics, add a biography and share the interests that make you who you are." },
  { number: "02", title: "Set your preferences", body: "Tell JoyHeart what matters to you through the available compatibility questions and private preferences." },
  { number: "03", title: "Connect with intention", body: "When discovery is available to your account, explore eligible profiles and connect through mutual interest." },
];
const faqs = [
  ["Who can join JoyHeart?", "JoyHeart is intended for adults aged 18 and over."],
  ["Can I meet people in other countries?", "JoyHeart is designed for international connections. Profile availability depends on your preferences, eligibility and platform discovery settings."],
  ["Is JoyHeart free?", "You can begin creating an account. Confirmed paid membership pricing and benefits will be published when configured."],
  ["How can I stay safe?", "Protect personal information, be cautious of financial requests, meet in public places and use the report or block tools when needed."],
  ["Are member profiles public?", "Member information is not displayed publicly by default. Discovery is part of the authenticated member experience and is controlled by eligibility and safety settings."],
];
export default function HomePage() {
  return <main className="site-shell">
    <section className="hero" id="our-approach">
      <div className="hero-copy">
        <p className="eyebrow">A more meaningful way to meet</p>
        <h1>Discover meaningful connections <span>around the world.</span></h1>
        <p className="hero-description">Meet interesting people, discover new connections and find someone special wherever life takes you. Start with a profile that reflects you—and let connection grow at its own pace.</p>
        <div className="hero-actions"><Link className="button button-primary" href="/signup">Join free <span aria-hidden="true">→</span></Link><Link className="button button-quiet" href="/how-it-works">Explore how it works</Link></div>
        <div className="trust-note" id="safety"><span className="trust-dot" aria-hidden="true" />Built around respect, privacy and genuine connection</div>
      </div>
      <div className="hero-art hero-photo-showcase" aria-label="JoyHeart connection illustration">
        <div className="art-orbit" aria-hidden="true" />
        <div className="heart-card"><div className="heart-symbol" aria-hidden="true">♡</div><strong>Where hearts find happiness</strong><p>Real people. Meaningful connections. A world of possibility.</p></div>
        <div className="floating-note note-top"><span aria-hidden="true">✧</span>Connection with intention</div>
        <div className="floating-note note-bottom"><span aria-hidden="true">⌖</span>Across the world</div>
      </div>
    </section>
    <section className="public-home-section intro-section"><p className="public-eyebrow">Welcome to JoyHeart</p><h2>A world of possibilities begins with a conversation.</h2><p>People connect in different ways and from different places. JoyHeart is being built to make meeting feel more thoughtful—with profiles, shared interests, compatibility preferences and a member experience centred on choice and respect.</p><Link className="text-link" href="/about">Get to know JoyHeart →</Link></section>
    <section className="public-home-section" id="how-it-works"><div className="section-heading"><p>How it works</p><h2>Three steps towards a meaningful beginning.</h2></div><div className="home-step-grid">{steps.map(step=><article className="home-step-card" key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div><div className="center-action"><Link className="button button-quiet" href="/how-it-works">See the full journey →</Link></div></section>
    <section className="public-home-section home-benefits"><div className="section-heading"><p>The JoyHeart difference</p><h2>Designed around what matters.</h2></div><div className="home-benefit-grid">{benefits.map(item=><article className="value-card" key={item.title}><div className="value-icon" aria-hidden="true">{item.icon}</div><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></section>
    <section className="public-home-section discovery-preview" id="discovery"><div><p className="public-eyebrow">Discover connections</p><h2>Your next conversation could begin anywhere.</h2><p>JoyHeart's discovery experience is for signed-in members. Profiles are not exposed to unauthenticated visitors, and discovery availability remains subject to account eligibility and platform safety settings.</p><Link className="button button-primary" href="/signup">Join JoyHeart</Link></div><div className="example-profile" aria-label="Illustrative profile preview"><span className="example-profile-mark">♡</span><p>Illustrative preview</p><strong>A profile built around you</strong><small>Interests · Preferences · Relationship intention</small></div></section>
    <section className="public-home-section global-section"><p className="public-eyebrow">A worldwide community</p><h2>Connection has no single postcode.</h2><p>JoyHeart is designed for adults with an international outlook. We do not publish unverified membership counts or country statistics.</p><div className="region-pills"><span>Different backgrounds</span><span>Shared interests</span><span>Meaningful conversations</span></div></section>
    <section className="public-home-section story-section"><div className="section-heading"><p>Member stories</p><h2>Real stories deserve real permission.</h2></div><p>We will share genuine member experiences only when they are submitted and approved for publication. There are no fabricated testimonials on JoyHeart.</p><Link className="text-link" href="/success-stories">About member stories →</Link></section>
    <section className="public-home-section membership-preview"><div><p className="public-eyebrow">Membership</p><h2>Begin with the essentials.</h2><p>Create an account and start building your profile. Confirmed premium prices and benefits will be shown here when subscription settings are ready.</p></div><Link className="button button-primary" href="/membership">Explore membership</Link></section>
    <section className="public-home-section safety-home"><div><p className="public-eyebrow">Safety and trust</p><h2>Take your time. Keep your boundaries.</h2><p>Protect your personal information, be cautious of financial requests and report behaviour that makes you uncomfortable. Our safety tools include member reporting and blocking, with photo moderation for submitted profile photos.</p><Link className="text-link" href="/safety">Visit the Safety Centre →</Link></div><div className="safety-points"><span>Privacy and personal choice</span><span>Report and block tools</span><span>Photo moderation</span><span>Practical dating safety guidance</span></div></section>
    <section className="public-home-section blog-preview"><div className="section-heading"><p>The JoyHeart journal</p><h2>Thoughts for better connections.</h2></div><p>Our dating advice and relationship articles are being prepared. Only reviewed and published articles will appear in the journal.</p><Link className="text-link" href="/blog">Visit the journal →</Link></section>
    <section className="public-home-section faq-preview"><div className="section-heading"><p>Questions</p><h2>A few things you may want to know.</h2></div><div className="home-faq-list">{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div><div className="center-action"><Link className="text-link" href="/faq">View all frequently asked questions →</Link></div></section>
    <section className="home-final-cta"><p className="public-eyebrow">Your next chapter</p><h2>Your next meaningful connection starts here.</h2><Link className="button button-primary" href="/signup">Join our community</Link></section>
  </main>;
}
