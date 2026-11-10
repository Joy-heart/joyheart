import Link from "next/link";

type PageKey = "about" | "mission" | "how" | "stories" | "membership" | "premium" | "safety" | "tips" | "help" | "faq" | "contact" | "blog" | "privacy" | "terms" | "cookies" | "guidelines" | "deletion";

const pages: Record<PageKey, { eyebrow: string; title: string; intro: string; sections: { title: string; body: string; bullets?: string[] }[]; cta?: { label: string; href: string } }> = {
  about: { eyebrow: "About JoyHeart", title: "A thoughtful place for meaningful connection.", intro: "JoyHeart is an international dating and matchmaking platform designed to help adults meet with intention, respect and care.", sections: [
    { title: "Why JoyHeart exists", body: "Meeting someone meaningful should feel considered, comfortable and personal. JoyHeart brings profile creation, compatibility preferences and member connections together in one place." },
    { title: "Our mission", body: "To make it easier for adults to discover genuine connections while keeping member choice, privacy and respectful behaviour at the centre." },
    { title: "Our values", body: "Respect, honesty, thoughtful communication, privacy and personal choice guide the experience we are building." },
    { title: "Our commitment", body: "We continue to build tools for safer participation, including member reporting, blocking and photo moderation. No online service can guarantee another person's intentions, so members should always take care." }
  ], cta: { label: "See how JoyHeart works", href: "/how-it-works" } },
  mission: { eyebrow: "Our mission and vision", title: "Connection across borders, grounded in respect.", intro: "JoyHeart aims to create a welcoming international space where adults can explore meaningful relationships at their own pace.", sections: [
    { title: "Our mission", body: "Help people meet with intention through a considered dating experience that values authenticity, respect and member control." },
    { title: "Our vision", body: "A world where distance and background need not prevent people from discovering a meaningful connection." },
    { title: "Our values", bullets: ["Treat every member with dignity.", "Be honest about who you are and what you seek.", "Respect boundaries and personal choices.", "Protect personal information and use safety tools when needed."] },
    { title: "Safety and privacy", body: "We are building privacy controls, reporting, blocking and moderation into the member experience. Members should still protect sensitive information and use good judgement when communicating online." }
  ], cta: { label: "Explore JoyHeart", href: "/how-it-works" } },
  how: { eyebrow: "How it works", title: "A simple start. A connection at your pace.", intro: "JoyHeart brings the steps of meeting someone together without rushing the relationship.", sections: [
    { title: "1. Create your account", body: "Register with your email and complete the account verification steps shown during signup. JoyHeart is intended for adults aged 18 and over." },
    { title: "2. Build your profile", body: "Add a display name, biography, interests and relationship intention. You can add photographs for review; submitted photos may remain pending until moderation is complete." },
    { title: "3. Set your preferences", body: "Answer the available personality questions and choose private discovery preferences. Your preferences help determine which introductions may be suitable." },
    { title: "4. Discover and express interest", body: "When discovery is available to your account, you can review eligible profiles and choose whether to like or pass. Discovery availability is controlled by platform safety settings." },
    { title: "5. Connect thoughtfully", body: "A mutual like can create a match and conversation. Communicate respectfully, keep personal information private and use report or block tools if something feels wrong." }
  ], cta: { label: "Create your account", href: "/signup" } },
  stories: { eyebrow: "Member stories", title: "Every meaningful connection has its own story.", intro: "We look forward to sharing real JoyHeart member experiences—with permission and only when stories have been approved for publication.", sections: [
    { title: "Stories are coming", body: "There are no verified member testimonials published on this page yet. We will not invent names, photographs, countries or relationship stories and present them as genuine." },
    { title: "Share your experience", body: "If you are a JoyHeart member and would like your story considered, contact the team through the support options available in your account. Publication would require your clear permission." }
  ], cta: { label: "Join JoyHeart", href: "/signup" } },
  membership: { eyebrow: "Membership", title: "Start with the essentials.", intro: "JoyHeart account and membership options are being developed alongside the member experience. We will publish confirmed prices and billing terms when they are configured.", sections: [
    { title: "Free access", body: "Create an account and begin setting up your member profile. Access to discovery and other member features may depend on account eligibility and platform availability." },
    { title: "Premium membership", body: "No premium price, billing interval or paid benefit is currently published here. We will not display made-up prices or accept payment through this information page." },
    { title: "Before you pay", body: "Any future subscription offer should clearly state its price, billing interval, included features, cancellation process and applicable terms." }
  ], cta: { label: "Create a free account", href: "/signup" } },
  premium: { eyebrow: "Premium features", title: "Clear benefits, before any upgrade.", intro: "This page will describe paid features only after the relevant subscription and payment options are available in JoyHeart.", sections: [
    { title: "What is available now", body: "JoyHeart is building its core profile, preferences, discovery, matching, messaging and safety experience. Access to individual features is controlled by account eligibility and platform settings." },
    { title: "Premium availability", body: "Premium pricing and benefits have not been confirmed for public display. No upgrade or payment button is shown until those details are configured." }
  ], cta: { label: "View membership information", href: "/membership" } },
  safety: { eyebrow: "Safety centre", title: "Your comfort and safety matter.", intro: "Online dating should be approached with care. Take your time, protect your information and trust your judgement.", sections: [
    { title: "Protect personal information", bullets: ["Keep your home address, financial details and identity documents private.", "Use care when sharing phone numbers or moving conversations off the platform.", "Use a strong, unique password and never share verification codes."] },
    { title: "Recognise suspicious behaviour", bullets: ["Be cautious of urgent requests for money, gifts or financial help.", "Watch for inconsistent stories, pressure, threats or attempts to isolate you.", "Do not open unexpected links or files from people you do not know."] },
    { title: "Meet safely", bullets: ["Choose a public place for a first meeting.", "Arrange your own transport and tell someone you trust about your plans.", "Do not feel pressured to continue a meeting or conversation."] },
    { title: "Report and block", body: "Use the in-product reporting and blocking tools when available. Reports help the team review concerning behaviour; do not use public pages to share another member's private information." }
  ], cta: { label: "Read dating safety tips", href: "/safety/tips" } },
  tips: { eyebrow: "Dating safety tips", title: "Small steps can help you date more safely.", intro: "A few practical habits can help you protect your privacy and make more confident decisions.", sections: [
    { title: "Keep private details private", body: "Avoid sharing passwords, verification codes, financial details, identity documents or your exact home or work location." },
    { title: "Be careful with money", body: "Never send money, cryptocurrency, gift cards or banking information to someone you have only met online, even if their story sounds urgent." },
    { title: "Check for consistency", body: "Take time to get to know someone. Be cautious if a person avoids reasonable questions, pressures you to move quickly or repeatedly changes important details." },
    { title: "Plan first meetings carefully", body: "Meet in a public place, arrange your own transport, tell a trusted person where you will be and leave if you feel uncomfortable." },
    { title: "Use platform safety tools", body: "Report suspicious profiles or messages and block accounts that make you uncomfortable. For emergencies or threats, contact the appropriate local authorities." }
  ], cta: { label: "Report a concern", href: "/report" } },
  help: { eyebrow: "Help centre", title: "Find a clear next step.", intro: "Browse help topics about using JoyHeart. Account-specific actions are available after you sign in.", sections: [
    { title: "Getting started", body: "Create an account at /signup and follow the verification instructions presented during registration." },
    { title: "Your profile", body: "Use your account profile tools to update your display name, biography, interests, preferences and photographs." },
    { title: "Discovery and matches", body: "Discovery is subject to account eligibility and platform availability. A mutual like can create a match and conversation." },
    { title: "Privacy and safety", body: "Use the report and block features when needed. Read our safety guidance before arranging an in-person meeting." },
    { title: "Need more help?", body: "For an account-specific safety report, sign in and use the reporting flow. General support contact details will be published here when a verified support channel is configured." }
  ], cta: { label: "Browse frequently asked questions", href: "/faq" } },
  faq: { eyebrow: "Frequently asked questions", title: "Answers to common questions.", intro: "A quick guide to the current JoyHeart experience.", sections: [
    { title: "What is JoyHeart?", body: "JoyHeart is an international dating and matchmaking platform designed around meaningful connections, member choice and respectful behaviour." },
    { title: "Who can join?", body: "JoyHeart is intended for adults aged 18 and over." },
    { title: "Is registration free?", body: "You can begin creating an account. Any paid membership prices and terms will be published only when confirmed." },
    { title: "How do I create a profile?", body: "Register, complete the required account steps, then add your profile details, interests and preferences." },
    { title: "Can I meet people in other countries?", body: "JoyHeart is designed for international connections. Which profiles are available to you depends on your preferences, eligibility and platform discovery settings." },
    { title: "How does matching work?", body: "The platform considers profile information and compatibility preferences. When discovery is enabled for eligible accounts, members can like or pass; mutual likes can create a match." },
    { title: "Can I report or block someone?", body: "Yes. JoyHeart includes member safety reporting and blocking tools. Use them if you experience suspicious or unwanted behaviour." },
    { title: "How do I delete my account?", body: "Use account controls where available or contact support through the available in-product route. See the account deletion information page for what to consider." }
  ], cta: { label: "Read the full help guide", href: "/help" } },
  contact: { eyebrow: "Contact JoyHeart", title: "We want to hear from you.", intro: "For your safety, use the in-product reporting route for member-specific concerns. We will publish general contact details when an official support channel is configured.", sections: [
    { title: "Account or member safety", body: "Sign in and use the Report a concern feature for a profile, message or conversation. This keeps the report connected to the appropriate account context." },
    { title: "General questions", body: "A public support email address, telephone number and contact form endpoint are not currently configured for this site. We will not show invented contact details or a form that cannot deliver your message." }
  ], cta: { label: "Go to reporting information", href: "/report" } },
  blog: { eyebrow: "The JoyHeart journal", title: "Ideas for more thoughtful connections.", intro: "Dating advice, relationship conversations and online safety guidance will appear here as articles are reviewed and published.", sections: [
    { title: "Articles coming soon", body: "There are no published articles available yet. We will only list articles that have been completed and approved for publication." },
    { title: "Explore safety guidance", body: "While the journal is being prepared, you can read our practical dating safety tips." }
  ], cta: { label: "Read dating safety tips", href: "/safety/tips" } },
  privacy: { eyebrow: "Privacy information", title: "Your information deserves care.", intro: "This page summarises important privacy principles for JoyHeart. The final policy must be read together with the actual services and settings in use.", sections: [
    { title: "Information you provide", body: "JoyHeart may process account details, profile information, photographs, interests, preferences and content you choose to submit while using the service." },
    { title: "How information is used", body: "Information is used to operate accounts and member features, support matching and communication, maintain safety, and respond to reports." },
    { title: "Visibility and privacy", body: "Some profile details may be shown to other eligible members as part of the service. Private preferences, account credentials and sensitive account information should not be treated as public profile content." },
    { title: "Retention and deletion", body: "Information may be retained as needed to operate the service, address safety issues and meet applicable legal obligations. Account deletion does not necessarily erase records that must lawfully be retained." },
    { title: "Cookies and third parties", body: "The specific cookies, analytics tools, processors and international transfer arrangements must be confirmed against the production configuration before this policy is treated as final." },
    { title: "Your choices", body: "Use available account settings to manage profile information and preferences. For account-specific safety concerns, use the in-product reporting route." },
    { title: "Policy status", body: "This public summary is not a substitute for a legally reviewed, complete privacy policy based on verified production data practices. Do not rely on it as a final legal notice until reviewed and approved." }
  ] },
  terms: { eyebrow: "Terms of service", title: "A respectful community starts with shared expectations.", intro: "These are the core expectations for using JoyHeart. The complete terms should be reviewed for the jurisdictions where the service operates before being treated as final.", sections: [
    { title: "Eligibility and accounts", body: "You must be at least 18 years old to use JoyHeart. Provide accurate information, keep your credentials secure and use only your own account." },
    { title: "Member responsibilities", bullets: ["Treat other members with respect.", "Do not impersonate another person or create deceptive profiles.", "Do not harass, threaten, exploit or discriminate against others.", "Do not use the service for scams, spam or unlawful activity.", "Respect other members' boundaries and privacy."] },
    { title: "Content and moderation", body: "You are responsible for content you submit. JoyHeart may review reports and moderate content or accounts under applicable community and safety rules." },
    { title: "Subscriptions", body: "No subscription price or payment terms are published on this page. Any future paid service must display its price, billing interval, renewal and cancellation terms before purchase." },
    { title: "Suspension and termination", body: "Access may be restricted where necessary to protect members, investigate reports or address violations. Specific procedures and appeal rights require final legal review." },
    { title: "Legal review notice", body: "This summary is not a complete contract and must be reviewed and approved before being relied on as final Terms of Service." }
  ] },
  cookies: { eyebrow: "Cookie policy", title: "Understand how browser storage may be used.", intro: "Cookies and similar technologies can help a website operate and remember choices. The exact technologies used by JoyHeart must be confirmed against the live configuration.", sections: [
    { title: "Essential storage", body: "Authentication and security features may rely on browser cookies or similar storage to keep account sessions working." },
    { title: "Analytics and preferences", body: "Analytics, marketing and preference cookies should only be described here after the relevant tools are confirmed. This page does not claim that any specific analytics or advertising service is active." },
    { title: "Managing cookies", body: "You can manage or clear cookies through your browser settings. Clearing essential cookies may sign you out or affect site functionality." },
    { title: "Consent and configuration", body: "A complete cookie consent experience must match the actual technologies and legal requirements for each visitor region. Confirm the production cookie inventory before publishing a final consent statement." }
  ] },
  guidelines: { eyebrow: "Community guidelines", title: "Make room for respect.", intro: "JoyHeart is intended to be a welcoming space for adults to meet and communicate with honesty and consideration.", sections: [
    { title: "Be authentic", body: "Use your own identity and genuine photographs. Do not impersonate others or misrepresent important details." },
    { title: "Respect boundaries", body: "No harassment, threats, coercion, unwanted sexual pressure or repeated unwanted contact." },
    { title: "No scams or exploitation", body: "Do not request money through deception, promote fraudulent schemes or exploit another member." },
    { title: "Keep content appropriate", body: "Do not share illegal, threatening, abusive or non-consensual content. Respect other people's privacy and consent." },
    { title: "Reporting and moderation", body: "Use the reporting tools to flag concerns. Reports may be reviewed by authorised staff and may lead to content or account action under platform rules." }
  ], cta: { label: "Report a concern", href: "/report" } },
  deletion: { eyebrow: "Account deletion", title: "Your account choices matter.", intro: "If you no longer want to use JoyHeart, review these points before requesting account deletion.", sections: [
    { title: "Start with account settings", body: "Use the account deletion control if it is available in your signed-in account. If it is not available, use the in-product support or reporting route to ask for help." },
    { title: "What may happen", body: "Deleting an account may remove or deactivate your profile and access to member features. Some records may be retained where necessary for safety, fraud prevention, dispute handling or legal obligations." },
    { title: "Subscriptions", body: "If paid subscriptions become available, cancellation of recurring billing may be a separate step from deleting an account. Review the actual billing terms before proceeding." },
    { title: "Need assistance?", body: "For an account-specific request, sign in and use the available support route. A verified public support contact will be added when configured." }
  ], cta: { label: "Return to your account", href: "/account" } }
};

export default function PublicPage({ page }: { page: PageKey }) {
  const content = pages[page];
  return <main className="public-page">
    <header className="public-page-hero">
      <p className="public-eyebrow">{content.eyebrow}</p>
      <h1>{content.title}</h1>
      <p>{content.intro}</p>
    </header>
    <div className="public-page-content">
      {content.sections.map((section, index) => <section className="public-content-section" key={section.title}>
        <span className="public-section-index">{String(index + 1).padStart(2, "0")}</span>
        <div><h2>{section.title}</h2><p>{section.body}</p>{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</div>
      </section>)}
      {content.cta && <div className="public-page-cta"><h2>Take the next step with JoyHeart.</h2><Link className="button button-primary" href={content.cta.href}>{content.cta.label} <span aria-hidden="true">→</span></Link></div>}
    </div>
  </main>;
}
