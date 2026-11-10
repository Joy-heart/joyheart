"use client";
import { useMemo, useState } from "react";

const entries = [
{category:"Getting started",q:"What is JoyHeart?",a:"JoyHeart is an international dating and matchmaking platform designed to help adults discover meaningful connections with member choice, privacy and respectful behaviour at its centre."},
{category:"Getting started",q:"Who can join JoyHeart?",a:"JoyHeart is intended for adults aged 18 and over. You must meet the age requirement and provide accurate information when creating an account."},
{category:"Getting started",q:"How do I create an account?",a:"Choose Join JoyHeart, enter the requested account details and follow the email verification instructions. Use an email address you control and keep your password private."},
{category:"Profiles",q:"How do I make my profile more helpful?",a:"Add a genuine display name, a thoughtful biography, interests and your relationship intention. Keep information respectful and avoid publishing private contact, financial or identity details."},
{category:"Profiles",q:"Can I add photographs?",a:"You can submit profile photographs through the member experience. Submitted photos may be reviewed before they become visible. Use recent photos that represent you and that you have the right to share."},
{category:"Discovery and matching",q:"How does matching work?",a:"Eligible members can explore profiles and express interest. A mutual like can create a match and make a conversation available. Discovery may depend on account eligibility, profile completion and platform safety settings."},
{category:"Discovery and matching",q:"Can I meet people in other countries?",a:"JoyHeart is designed for international connections. The profiles shown to you depend on your preferences, eligibility and the availability of members in the service."},
{category:"Discovery and matching",q:"Why can I not see discovery profiles?",a:"Discovery may not be available until account verification or profile requirements are complete. Check your account notices and profile details. If the issue continues, use the support route available in your signed-in account."},
{category:"Privacy and safety",q:"Are my profile details public on the internet?",a:"Member discovery is part of the signed-in experience. Do not assume every profile field is private from other eligible members; review visibility settings and avoid sharing sensitive information."},
{category:"Privacy and safety",q:"How do I report or block someone?",a:"Use the report or block controls available on the member profile or conversation. Include clear details in a report and do not publish another member's private information elsewhere."},
{category:"Privacy and safety",q:"How can I avoid dating scams?",a:"Never send money, gift cards, cryptocurrency, passwords or verification codes to someone you have only met online. Be cautious of urgency, requests for secrecy and attempts to move you away from platform safety tools."},
{category:"Membership and account",q:"Is JoyHeart free?",a:"You can begin creating an account. Any paid membership price, billing interval and premium benefits will be displayed clearly before a paid purchase is offered."},
{category:"Membership and account",q:"How do I change my account details?",a:"Sign in and open your account or profile settings. Available editing options depend on the feature currently enabled for your account."},
{category:"Membership and account",q:"How can I delete my account?",a:"Use the account deletion control if it is available in your signed-in account. Review the account deletion information page first. Some records may need to be retained for safety, fraud prevention or legal obligations."}
];
const categories = ["All questions", ...Array.from(new Set(entries.map(x=>x.category)))];

export default function InteractiveFaq() {
 const [query,setQuery]=useState(""); const [category,setCategory]=useState("All questions");
 const filtered=useMemo(()=>entries.filter(x=>(category==="All questions"||x.category===category)&&(!query.trim()||[x.q,x.a,x.category].join(" ").toLowerCase().includes(query.trim().toLowerCase()))),[query,category]);
 return <main className="jh-resource-page">
  <header className="jh-resource-hero"><p className="public-eyebrow">A little clarity goes a long way</p><h1>Frequently asked questions</h1><p>Find practical answers about joining, profiles, discovery, matching, privacy and staying safe.</p></header>
  <section className="jh-faq-tools" aria-label="Search frequently asked questions"><label htmlFor="jh-faq-search">Search for an answer</label><input id="jh-faq-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try “profile photos” or “safety”…"/><div className="jh-faq-categories" aria-label="Filter by topic">{categories.map(c=><button type="button" key={c} className={category===c?"active":""} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><p className="jh-faq-count" aria-live="polite">{filtered.length} {filtered.length===1?"answer":"answers"} found</p></section>
  <section className="jh-faq-results">{filtered.length?filtered.map((x,i)=><details className="jh-faq-item" key={x.q}><summary><span>{x.q}</span><b aria-hidden="true">+</b></summary><p>{x.a}</p><small>{x.category}</small></details>):<div className="jh-faq-empty"><h2>No matching answers yet</h2><p>Try a different word or choose another topic.</p><button type="button" onClick={()=>{setQuery("");setCategory("All questions")}}>Clear filters</button></div>}</section>
  <footer className="jh-resource-cta"><h2>Still need a hand?</h2><p>For account-specific questions, sign in and use the support options available in your account.</p><a className="button button-primary" href="/login">Go to your account</a></footer>
 </main>;
}
