import Link from "next/link";

const principles = [
  { number: "01", icon: "♡", title: "Meaningful over hurried", text: "We believe good connections deserve time. JoyHeart is designed to help adults discover people thoughtfully, communicate at their own pace and decide for themselves what feels right." },
  { number: "02", icon: "◎", title: "Respect is the starting point", text: "Every member deserves dignity, honesty and clear boundaries. We expect people to treat one another with consideration, whether a connection becomes a relationship or not." },
  { number: "03", icon: "✧", title: "Your choices matter", text: "Your profile, preferences and interactions should reflect your decisions. We aim to make the experience clear and give members meaningful control over how they participate." },
  { number: "04", icon: "⌂", title: "Safety belongs in the experience", text: "Trust is built through practical safeguards and responsible behaviour. Reporting, blocking, photo review and privacy-conscious design are part of the work—not promises that risk can be eliminated." },
];

const pillars = [
  { icon: "♡", title: "Profiles with personality", text: "Share the interests, values and relationship intentions that help others understand who you are." },
  { icon: "✧", title: "Discovery with intention", text: "Explore eligible member profiles and use your preferences to guide the connections you choose to pursue." },
  { icon: "↔", title: "Mutual connections", text: "When interest is mutual, matching can open the door to a conversation and the possibility of something meaningful." },
  { icon: "盾", title: "Tools for safer dating", text: "Use available reporting and blocking tools, follow practical safety guidance and take your time getting to know someone." },
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="about-eyebrow"><span /> THE STORY BEHIND JOYHEART</p>
          <h1>Love has no borders. <em>Connection starts with a choice.</em></h1>
          <p className="about-lead">JoyHeart is a worldwide dating platform created around a simple belief: meaningful connections begin when people can meet with openness, intention and respect.</p>
          <div className="about-actions">
            <Link className="button button-primary" href="/signup">Join JoyHeart <span aria-hidden="true">→</span></Link>
            <Link className="about-text-link" href="/how-it-works">Discover how it works <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="about-small-note">JoyHeart — Love Without Borders.</p>
        </div>
        <div className="about-hero-art" aria-label="Illustration representing people connecting across the world">
          <div className="about-orbit about-orbit-one" />
          <div className="about-orbit about-orbit-two" />
          <div className="about-world-card">
            <span className="about-heart-mark">♡</span>
            <span className="about-world-label">ONE WORLD, MANY STORIES</span>
            <strong>Different paths.<br />Shared hope.</strong>
            <p>There is more than one way to find a meaningful connection.</p>
          </div>
          <span className="about-float about-float-top">✧ Across the world</span>
          <span className="about-float about-float-bottom">♡ With intention</span>
        </div>
      </section>

      <section className="about-intro about-wrap">
        <p className="about-eyebrow">WHY WE ARE HERE</p>
        <h2>Because a meaningful connection can change the way a day, a season or a life feels.</h2>
        <p>Meeting someone should leave room for curiosity, honesty and possibility. But online dating can sometimes feel rushed or impersonal. JoyHeart is being built to offer a more thoughtful place to begin: a place where adults can introduce themselves, discover people beyond their immediate circles and choose which connections they want to explore.</p>
        <p>We bring people together across locations and backgrounds while keeping respect, personal choice and care at the centre of the experience. We do not promise that every introduction will become a relationship. We aim to make the first steps towards meeting someone feel more considered.</p>
      </section>

      <section className="about-purpose">
        <div className="about-wrap about-purpose-grid">
          <article>
            <p className="about-eyebrow">OUR MISSION</p>
            <h2>Make room for genuine connection.</h2>
            <p>Our mission is to help adults discover and build meaningful connections through an approachable international dating experience—one that values authenticity, thoughtful introductions, respectful communication and member choice.</p>
          </article>
          <article>
            <p className="about-eyebrow">OUR VISION</p>
            <h2>A world where distance is not the end of the story.</h2>
            <p>We envision a welcoming global community where people can connect beyond borders, learn about one another and explore relationships with openness. Different cultures, experiences and perspectives can be the beginning of a conversation, not a barrier to it.</p>
          </article>
        </div>
      </section>

      <section className="about-wrap about-values">
        <div className="about-section-heading">
          <p className="about-eyebrow">WHAT GUIDES US</p>
          <h2>The values behind every connection.</h2>
          <p>These principles shape the experience we are working to create and the way we expect our community to treat one another.</p>
        </div>
        <div className="about-value-grid">
          {principles.map((item) => (
            <article className="about-value-card" key={item.number}>
              <div className="about-value-top"><span>{item.icon}</span><small>{item.number}</small></div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-experience">
        <div className="about-wrap">
          <div className="about-section-heading">
            <p className="about-eyebrow">THE JOYHEART EXPERIENCE</p>
            <h2>A thoughtful way to begin.</h2>
            <p>JoyHeart brings useful parts of the dating journey together, so members can focus on getting to know people.</p>
          </div>
          <div className="about-pillar-grid">
            {pillars.map((item, index) => (
              <article className="about-pillar" key={item.title}>
                <span className="about-pillar-icon">{item.icon}</span>
                <small>0{index + 1}</small>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <p className="about-feature-note">Feature availability can depend on account eligibility, moderation and current platform settings.</p>
        </div>
      </section>

      <section className="about-global about-wrap">
        <div className="about-global-art" aria-hidden="true">
          <div className="about-global-ring"><span>♡</span></div>
          <i className="about-dot about-dot-a" /><i className="about-dot about-dot-b" /><i className="about-dot about-dot-c" />
        </div>
        <div className="about-global-copy">
          <p className="about-eyebrow">LOVE WITHOUT BORDERS</p>
          <h2>Different places. Different stories. The same wish to be understood.</h2>
          <p>JoyHeart is designed for international connections. Whether someone is nearby or living in another part of the world, a profile can be the start of learning about a new person, a new perspective and a shared possibility.</p>
          <p>We celebrate the individuality people bring to a connection. No two journeys are alike, and no one should feel pressured to follow someone else's timeline.</p>
          <Link className="about-inline-link" href="/discover">Explore JoyHeart <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="about-trust">
        <div className="about-wrap about-trust-inner">
          <div>
            <p className="about-eyebrow">TRUST TAKES ALL OF US</p>
            <h2>A better dating experience is built together.</h2>
            <p>Technology can support safer interactions, but it cannot guarantee another person's identity, intentions or actions. We encourage every member to stay thoughtful, protect personal information, respect boundaries and use the safety tools available.</p>
          </div>
          <div className="about-trust-list">
            <Link href="/safety">Safety centre <span>→</span></Link>
            <Link href="/safety/tips">Practical dating safety tips <span>→</span></Link>
            <Link href="/community-guidelines">Community guidelines <span>→</span></Link>
            <Link href="/privacy-policy">Privacy information <span>→</span></Link>
          </div>
        </div>
      </section>

      <section className="about-wrap about-faq">
        <div className="about-section-heading">
          <p className="about-eyebrow">A FEW THINGS TO KNOW</p>
          <h2>About JoyHeart, at a glance.</h2>
        </div>
        <div className="about-faq-list">
          <details><summary>Who is JoyHeart for?</summary><p>JoyHeart is intended for adults aged 18 and over who want to meet people and explore meaningful connections.</p></details>
          <details><summary>Can I connect with people in other countries?</summary><p>Yes. JoyHeart is designed for international dating. The profiles available to each member depend on preferences, eligibility and platform discovery settings.</p></details>
          <details><summary>Does JoyHeart guarantee that I will find a partner?</summary><p>No dating platform can guarantee a match or relationship. JoyHeart provides tools to help people discover one another; every connection depends on the people involved.</p></details>
          <details><summary>What should I do if something feels wrong?</summary><p>Trust your judgement. Stop communicating if you feel uncomfortable, use available report or block tools and review our safety guidance. For immediate danger, contact local emergency services.</p></details>
        </div>
      </section>

      <section className="about-final-cta">
        <p className="about-eyebrow">YOUR NEXT CHAPTER CAN START HERE</p>
        <h2>Be open to the possibility of a meaningful connection.</h2>
        <p>Create your profile, share what matters to you and discover people at your own pace.</p>
        <div className="about-actions about-actions-center">
          <Link className="button button-primary" href="/signup">Join JoyHeart <span aria-hidden="true">→</span></Link>
          <Link className="button button-quiet" href="/how-it-works">How it works</Link>
        </div>
        <small>JoyHeart — Love Without Borders · <a href="https://joyheart.app">joyheart.app</a></small>
      </section>
    </main>
  );
}
