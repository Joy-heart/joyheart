import Link from "next/link";

export type ServiceKey = "overview" | "smart-matching" | "discover" | "messaging" | "profile-building" | "verified-profiles" | "safety-and-privacy" | "relationship-guidance";

const services: Record<ServiceKey, { eyebrow: string; title: string; intro: string; promise: string; sections: { title: string; body: string; bullets?: string[] }[] }> = {
  overview: {
    eyebrow: "The JoyHeart experience",
    title: "Meaningful connections, thoughtfully brought together.",
    intro: "JoyHeart is an international dating and matchmaking platform for adults who want to meet with intention. Explore the tools that help you present yourself, discover people, build connections and make thoughtful choices.",
    promise: "A considered dating experience, with respect and member choice at its heart.",
    sections: [
      { title: "Start with a profile that feels like you", body: "Introduce yourself through your biography, interests, relationship intentions and the profile details available in your account." },
      { title: "Discover people with intention", body: "Explore eligible member profiles when discovery is available to your account. Your preferences and platform safety settings help shape what you can see." },
      { title: "Build a connection at your pace", body: "Express interest when someone catches your attention. Mutual interest can create a match and open the way to conversation." },
      { title: "Keep respect and safety close", body: "Use the available privacy, reporting and blocking tools. Take your time, protect personal information and trust your judgement." }
    ]
  },
  "smart-matching": {
    eyebrow: "Compatibility and introductions",
    title: "Look beyond the first impression.",
    intro: "Matching on JoyHeart is designed to consider more than a photograph. Profile details, interests, relationship intentions and the preferences available in your account can help guide relevant introductions.",
    promise: "Compatibility can guide a conversation. It cannot guarantee a relationship.",
    sections: [
      { title: "Share what matters to you", body: "Complete the profile fields and personality or preference questions made available in your member account. Honest answers give the platform better context." },
      { title: "Preferences help shape discovery", body: "Your selected preferences can influence which eligible profiles are presented to you, subject to the platform's current matching and safety rules." },
      { title: "Mutual interest comes first", body: "When discovery is enabled, you can choose to like or pass. A mutual like may create a match and allow the members to continue into conversation." },
      { title: "Stay open-minded", body: "No compatibility system knows a person completely. Use matching as a starting point, communicate respectfully and make your own decisions." }
    ]
  },
  discover: {
    eyebrow: "Explore member profiles",
    title: "Discover people at your own pace.",
    intro: "The JoyHeart discovery experience is designed to help eligible signed-in members explore profiles and decide which connections they would like to pursue.",
    promise: "Your discovery experience belongs inside your member account—not on a public directory.",
    sections: [
      { title: "A member-first experience", body: "Member profiles are part of the authenticated experience. Public visitors cannot browse a directory of private member profiles." },
      { title: "Explore with your preferences", body: "Discovery may take account preferences and eligibility into consideration. What appears depends on your settings and platform availability." },
      { title: "Choose your next step", body: "Review the information a member has chosen to share and decide whether to express interest or move on." },
      { title: "Respect privacy", body: "Do not copy, publish or misuse another member's photographs or personal information. Report profiles that appear deceptive or inappropriate." }
    ]
  },
  messaging: {
    eyebrow: "Conversations and connection",
    title: "Let a good conversation take its time.",
    intro: "When two members connect through mutual interest, JoyHeart's messaging experience is intended to give them a place to get to know each other with respect.",
    promise: "A thoughtful message is better than pressure. Let trust grow naturally.",
    sections: [
      { title: "Start from a mutual connection", body: "Messaging is associated with the member connection and match experience. Access depends on account eligibility and the messaging features enabled on the platform." },
      { title: "Be genuine and respectful", body: "Introduce yourself, ask thoughtful questions and respect the other person's pace. A member never owes anyone a reply." },
      { title: "Keep sensitive information private", body: "Do not share passwords, verification codes, financial information or identity documents in conversations." },
      { title: "Take action when something feels wrong", body: "Use the available report and block tools for unwanted or suspicious behaviour. For immediate danger, contact the appropriate local authorities." }
    ]
  },
  "profile-building": {
    eyebrow: "Your profile, your story",
    title: "Show the person behind the profile.",
    intro: "Your profile helps other eligible members understand who you are, what you enjoy and what kind of connection you hope to find.",
    promise: "Be honest, be yourself and share only what you are comfortable making visible.",
    sections: [
      { title: "Write a welcoming introduction", body: "Use your biography to describe your personality, interests and what you value. Clear, genuine details help start better conversations." },
      { title: "Share your interests", body: "Choose interests and answer available personality questions to give your profile more depth and context." },
      { title: "Choose photographs thoughtfully", body: "Use recent photographs that represent you. Submitted profile photos may be reviewed before they are approved for display." },
      { title: "Keep your information current", body: "Review your profile and preferences from time to time. Avoid publishing your home address, financial details or other sensitive information." }
    ]
  },
  "verified-profiles": {
    eyebrow: "Authenticity and trust",
    title: "Trust grows through honest participation.",
    intro: "JoyHeart is building a member experience that supports authenticity through account safeguards, profile-photo review and ways to report concerns.",
    promise: "Verification and moderation can reduce risk, but no online platform can guarantee another person's identity or intentions.",
    sections: [
      { title: "Account safeguards", body: "Follow the registration and account verification steps presented by JoyHeart. Keep your login details private and use a unique password." },
      { title: "Profile-photo review", body: "Photos submitted for member profiles may go through moderation before they are approved for display. A pending photo is not the same as an approved photo." },
      { title: "Report suspicious behaviour", body: "If a profile appears misleading or someone behaves inappropriately, use the reporting tools available in your account." },
      { title: "Use your own judgement", body: "Do not rely on a badge, photo or online conversation alone. Take time to get to know someone and arrange first meetings carefully." }
    ]
  },
  "safety-and-privacy": {
    eyebrow: "Your privacy and wellbeing",
    title: "Connection should never come at the cost of your safety.",
    intro: "JoyHeart is designed with member choice and respectful participation in mind. You can help protect yourself by managing what you share and using the safety tools available to you.",
    promise: "Take your time. Keep your boundaries. Ask for help when you need it.",
    sections: [
      { title: "Control what you share", body: "Only include profile information you are comfortable sharing with eligible members. Keep financial details, passwords, verification codes and precise home or work locations private." },
      { title: "Report and block", body: "Use in-product reporting and blocking when available to respond to unwanted contact or suspicious behaviour. Reports help the team review concerns." },
      { title: "Recognise common warning signs", bullets: ["Requests for money, gift cards, cryptocurrency or financial help.", "Pressure to move quickly, keep secrets or leave the platform immediately.", "Threats, harassment, inconsistent stories or attempts to obtain private documents."] },
      { title: "Meet with care", body: "Choose a public place, arrange your own transport and tell someone you trust about your plans. Leave if you feel uncomfortable." },
      { title: "Read the full safety guidance", body: "Visit the JoyHeart Safety Centre for more practical guidance about online dating and meeting someone in person." }
    ]
  },
  "relationship-guidance": {
    eyebrow: "Thoughtful dating guidance",
    title: "Make space for a connection that feels right.",
    intro: "Good relationships take time, honesty and respect. JoyHeart's guidance is intended to help members approach dating with confidence while staying true to their boundaries.",
    promise: "There is no perfect script for love. Start with honesty and mutual respect.",
    sections: [
      { title: "Know what you are looking for", body: "Think about the values, relationship intentions and qualities that matter to you. You do not need to have every answer before you begin." },
      { title: "Ask and listen", body: "Show genuine curiosity, ask open questions and give the other person room to share. A good conversation should feel mutual." },
      { title: "Respect different timelines", body: "People build trust at different speeds. Do not pressure someone to share private details, meet, or move a conversation elsewhere." },
      { title: "Keep your boundaries", body: "It is okay to say no, pause a conversation or end contact. A respectful connection makes room for both people's choices." },
      { title: "Choose safety over pressure", body: "Be cautious of financial requests and plan first meetings in public places. Read the Safety Centre before meeting someone." }
    ]
  }
};

const links: { key: ServiceKey; title: string; description: string; number: string }[] = [
  { key: "smart-matching", title: "Smart matching", description: "Compatibility preferences and mutual interest.", number: "01" },
  { key: "discover", title: "Discover people", description: "Explore eligible profiles in the member experience.", number: "02" },
  { key: "messaging", title: "Meaningful conversations", description: "Build a connection through respectful communication.", number: "03" },
  { key: "profile-building", title: "Profile building", description: "Share your story, interests and intentions.", number: "04" },
  { key: "verified-profiles", title: "Profiles and photo review", description: "Understand account safeguards and photo moderation.", number: "05" },
  { key: "safety-and-privacy", title: "Safety and privacy", description: "Protect your boundaries and personal information.", number: "06" },
  { key: "relationship-guidance", title: "Relationship guidance", description: "Practical ideas for more thoughtful dating.", number: "07" }
];

export default function ServicesPage({ page = "overview" }: { page?: ServiceKey }) {
  const content = services[page];
  const overview = page === "overview";
  return <main className="services-page">
    <section className="services-hero">
      <div className="services-hero-copy">
        <p className="services-eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="services-intro">{content.intro}</p>
        <div className="services-actions">
          <Link className="button button-primary" href="/signup">Join JoyHeart <span aria-hidden="true">→</span></Link>
          <Link className="button button-quiet" href="/how-it-works">How it works</Link>
        </div>
      </div>
      <aside className="services-hero-note">
        <span aria-hidden="true">♡</span>
        <p>Where hearts find happiness</p>
        <strong>{content.promise}</strong>
      </aside>
    </section>
    {overview ? <section className="services-directory" aria-labelledby="services-directory-title">
      <div className="services-section-heading"><p>Explore our services</p><h2 id="services-directory-title">A thoughtful journey, step by step.</h2><span>Explore each part of the JoyHeart experience.</span></div>
      <div className="services-card-grid">{links.map(item => <Link className="service-card" href={`/services/${item.key}`} key={item.key}><span className="service-card-number">{item.number}</span><h3>{item.title}</h3><p>{item.description}</p><span className="service-card-link">Explore service <span aria-hidden="true">→</span></span></Link>)}</div>
    </section> : <section className="service-detail-layout">
      <article className="service-detail-content">{content.sections.map((section,index)=><section className="service-detail-section" key={section.title}><span className="service-detail-index">{String(index+1).padStart(2,"0")}</span><div><h2>{section.title}</h2>{section.body && <p>{section.body}</p>}{section.bullets && <ul>{section.bullets.map(item=><li key={item}>{item}</li>)}</ul>}</div></section>)}</article>
      <aside className="service-detail-aside"><p className="services-eyebrow">Explore JoyHeart</p><h2>Every connection starts with a choice.</h2><p>Explore the other parts of the member experience and choose what feels right for you.</p><Link className="text-link" href="/services">View all services →</Link><div className="service-aside-links">{links.filter(item=>item.key!==page).map(item=><Link href={`/services/${item.key}`} key={item.key}>{item.title}<span aria-hidden="true">↗</span></Link>)}</div></aside>
    </section>}
    <section className="services-bottom-cta"><p className="services-eyebrow">Your next chapter can start here</p><h2>Meet with intention. Connect with respect.</h2><p>Create your JoyHeart account and begin building a profile that reflects you.</p><Link className="button button-primary" href="/signup">Get started with JoyHeart →</Link></section>
  </main>;
}
