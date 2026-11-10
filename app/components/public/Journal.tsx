"use client";

import { useState } from "react";

const articles = [
  {
    category: "Dating with intention",
    read: "5 min read",
    title: "A thoughtful first message makes room for a real conversation",
    summary: "A good opening is personal, kind and easy to answer. It shows curiosity without putting pressure on someone to respond.",
    image: "https://images.pexels.com/photos/5911182/pexels-photo-5911182.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200",
    imageAlt: "A couple sharing a warm conversation during a cafe date",
    imageCredit: "Katerina Holmes / Pexels",
    imageCreditUrl: "https://www.pexels.com/photo/young-couple-talking-while-having-date-in-cafe-5911182/", 
    body: [
      "Start with something you genuinely noticed in the person's profile. A shared interest, a place they mentioned or a book they enjoy gives the conversation a natural beginning.",
      "Ask one open question rather than sending a list. Give the other person room to share as much or as little as they feel comfortable sharing.",
      "Avoid copy-and-paste compliments, demands for an immediate reply or requests for private contact details. A respectful conversation develops at a pace that works for both people."
    ]
  },
  {
    category: "Online safety",
    read: "6 min read",
    title: "Recognising the warning signs of a romance scam",
    summary: "Pressure, secrecy and requests for money are reasons to pause. Learn how to protect your information while getting to know someone online.",
    image: "https://images.pexels.com/photos/38675509/pexels-photo-38675509.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200",
    imageAlt: "A close-up of a couple holding hands outdoors",
    imageCredit: "Dulce Panebra / Pexels",
    imageCreditUrl: "https://www.pexels.com/photo/romantic-couple-holding-hands-outdoors-38675509/", 
    body: [
      "Romance scammers may build trust quickly before introducing an emergency, investment opportunity or urgent financial request. They may ask for money, gift cards, cryptocurrency, identity documents or account access.",
      "Be especially cautious when someone repeatedly avoids reasonable questions, refuses to meet or verify their identity in a safe way, asks you to keep the relationship secret, or tries to move you away from platform reporting tools.",
      "Never send money or share passwords and verification codes with someone you have only met online. Save relevant messages, stop responding if you feel pressured, and use the platform's report and block tools. If you believe you have been defrauded, contact your financial provider and appropriate local authorities promptly."
    ]
  },
  {
    category: "Healthy relationships",
    read: "4 min read",
    title: "Let a new connection grow at a comfortable pace",
    summary: "There is no single timetable for trust. Clear boundaries and honest communication help both people feel respected.",
    image: "https://images.pexels.com/photos/6579098/pexels-photo-6579098.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200",
    imageAlt: "A couple walking together in a park with their dog",
    imageCredit: "Andres Ayrton / Pexels",
    imageCreditUrl: "https://www.pexels.com/photo/positive-black-couple-walking-in-park-with-dog-6579098/", 
    body: [
      "It is natural to feel excited when you meet someone interesting. Still, trust is built through consistent actions over time, not promises made in the first few conversations.",
      "Share information gradually. You can be warm and interested while keeping your home address, workplace details, financial information and identity documents private.",
      "A healthy connection leaves room for both people to say yes, no or not yet. Respecting boundaries is not a setback; it is part of getting to know each other well."
    ]
  },
  {
    category: "Online safety",
    read: "5 min read",
    title: "Planning a safer first meeting",
    summary: "A little preparation can help you feel more confident when you decide to meet someone in person.",
    image: "https://images.pexels.com/photos/7339317/pexels-photo-7339317.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200",
    imageAlt: "Two people getting to know each other over a cafe date",
    imageCredit: "cottonbro studio / Pexels",
    imageCreditUrl: "https://www.pexels.com/photo/two-people-meeting-for-the-first-time-in-a-cafe-7339317/", 
    body: [
      "Choose a public place where you feel comfortable, and arrange your own transport so you can leave whenever you wish. Consider meeting during the day for a first meeting.",
      "Tell a trusted person where you are going and when you expect to be back. Keep your phone charged and avoid sharing financial details or leaving drinks unattended.",
      "You do not owe anyone a longer meeting than you want. If you feel uncomfortable, leave and contact someone you trust. For immediate danger, seek local emergency assistance."
    ]
  },
  {
    category: "Profiles and connection",
    read: "4 min read",
    title: "Create a profile that sounds like you",
    summary: "A sincere profile gives people a better sense of your personality, interests and the kind of relationship you hope to build.",
    image: "https://images.pexels.com/photos/5083564/pexels-photo-5083564.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200",
    imageAlt: "A couple sharing a romantic date in a restaurant",
    imageCredit: "Jep Gambardella / Pexels",
    imageCreditUrl: "https://www.pexels.com/photo/a-couple-on-a-date-in-a-restaurant-5083564/", 
    body: [
      "Use a recent photograph that clearly represents you and write a biography in your own voice. A few specific details are more memorable than a long list of generic adjectives.",
      "Mention the activities, values or everyday moments that matter to you. Be honest about your relationship intentions and respectful about the people you hope to meet.",
      "Leave out sensitive information such as your address, financial details, identity numbers and private contact information. You can share more as trust develops."
    ]
  },
  {
    slug: "find-a-serious-relationship-online",
    category: "Dating with intention",
    read: "7 min read",
    title: "How to Find a Serious Relationship Online",
    summary: "A practical guide to dating with intention, communicating clearly and recognising when someone is looking for the same kind of commitment.",
    image: "",
    imageAlt: "",
    body: []
  },
  {
    slug: "dating-profile-tips-first-impression",
    category: "Profiles and connection",
    read: "6 min read",
    title: "Best Dating Profile Tips: How to Make a Great First Impression",
    summary: "Make your dating profile more inviting with authentic photos, a clear bio and details that help compatible people start a conversation.",
    image: "",
    imageAlt: "",
    body: []
  },
  {
    slug: "know-if-someone-is-genuinely-interested",
    category: "Healthy relationships",
    read: "6 min read",
    title: "How to Know If Someone Is Genuinely Interested in You",
    summary: "Learn to recognise healthy signs of interest without rushing to conclusions or confusing intensity with genuine connection.",
    image: "",
    imageAlt: "",
    body: []
  },
  {
    slug: "long-distance-relationship-trust-connection",
    category: "Healthy relationships",
    read: "7 min read",
    title: "Long-Distance Relationships: How to Build Trust and Stay Connected",
    summary: "Distance can make dating more challenging. Honest communication, realistic expectations and shared plans can help couples stay connected.",
    image: "",
    imageAlt: "",
    body: []
  },
  {
    slug: "online-dating-red-flags",
    category: "Online safety",
    read: "7 min read",
    title: "Red Flags in Online Dating: What You Should Never Ignore",
    summary: "Know the warning signs of manipulation and romance scams, and learn practical steps to protect your privacy and wellbeing.",
    image: "",
    imageAlt: "",
    body: []
  },
];

const categories = ["All articles", ...Array.from(new Set(articles.map((article) => article.category)))];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function Journal() {
  const [category, setCategory] = useState("All articles");
  const [query, setQuery] = useState("");

  const searchTerms = normalize(query).split(/\s+/).filter(Boolean);
  const filtered = articles.filter((article) => {
    const categoryMatches = category === "All articles" || article.category === category;
    const searchableText = normalize([article.title, article.summary, article.category, ...article.body].join(" "));
    const searchMatches = searchTerms.length === 0 || searchTerms.every((term) => searchableText.includes(term));
    return categoryMatches && searchMatches;
  });

  return (
    <main className="jh-resource-page">
      <header className="jh-resource-hero">
        <p className="public-eyebrow">The JoyHeart journal</p>
        <h1>Thoughts for more meaningful connections.</h1>
        <p>Practical guidance for dating with intention, building healthy relationships and looking after yourself online.</p>
      </header>

      <section className="jh-journal-tools" aria-label="Find journal articles">
        <label htmlFor="jh-journal-search">Find an article</label>
        <input
          id="jh-journal-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search dating, safety, relationships…"
          aria-controls="jh-journal-results"
        />
        <div className="jh-faq-categories" aria-label="Filter articles by category">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? "active" : ""}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <output
          key={category + ":" + normalize(query) + ":" + filtered.length}
          className="jh-faq-count"
          aria-live="polite"
          aria-atomic="true"
          data-result-count={filtered.length}
        >
          {filtered.length} {filtered.length === 1 ? "article" : "articles"} found
          {query.trim() ? " for “" + query.trim() + "”" : ""}
          {category !== "All articles" ? " in " + category : ""}
        </output>
      </section>

      <section className="jh-journal-grid" id="jh-journal-results" aria-label="Journal articles" data-result-count={filtered.length}>
        {filtered.map((article) => (
          <article className="jh-journal-card" key={article.title}>
            {article.image ? <div className="jh-journal-image">
              <img
                src={article.image}
                alt={article.imageAlt}
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                }}
              />
            </div> : null}
            <div className="jh-journal-card-content">
              <div className="jh-journal-card-top">
                <span>{article.category}</span>
                <small>{article.read}</small>
              </div>
              <h2>{article.title}</h2>
              <p>{article.summary}</p>
              {"slug" in article && article.slug ? (
                <a className="jh-journal-read-link" href={`/blog/${article.slug}`}>Read article <span aria-hidden="true">→</span></a>
              ) : (
                <details>
                  <summary>Read article <span aria-hidden="true">＋</span></summary>
                  <div className="jh-article-body">
                    {article.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                  </div>
                </details>
              )}
            </div>
          </article>
        ))}
      </section>

      {!filtered.length && (
        <div className="jh-faq-empty" role="status">
          <h2>No articles found</h2>
          <p>
            {query.trim()
              ? `We couldn't find an article matching “${query.trim()}”. Try a different word or clear your filters.`
              : "There are no articles in this category yet. Choose another category to continue."}
          </p>
          <button type="button" onClick={() => { setQuery(""); setCategory("All articles"); }}>
            Clear search and filters
          </button>
        </div>
      )}

      <footer className="jh-resource-cta">
        <h2>Connection starts with care.</h2>
        <p>Explore JoyHeart's practical safety guidance before taking your next step.</p>
        <a className="button button-primary" href="/safety">Visit the Safety Centre</a>
      </footer>
    </main>
  );
}
