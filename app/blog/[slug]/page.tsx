import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { additionalJournalArticles, getAdditionalJournalArticle, journalCategorySlug } from "@/app/lib/additional-journal-articles";

const siteUrl = "https://joyheart.app";

export function generateStaticParams() {
  return additionalJournalArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getAdditionalJournalArticle(slug);
  if (!article) return { title: "Article not found | JoyHeart", robots: { index: false, follow: false } };
  const canonical = `${siteUrl}/blog/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical },
    keywords: [article.category, "JoyHeart", "online dating", "meaningful relationships", ...article.title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3)],
    openGraph: { type: "article", url: canonical, siteName: "JoyHeart", title: article.title, description: article.description, images: [{ url: article.image, alt: article.imageAlt }] },
    twitter: { card: "summary_large_image", title: article.title, description: article.description, images: [article.image] },
  };
}

export default async function JournalArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getAdditionalJournalArticle(slug);
  if (!article) notFound();
  const canonical = `${siteUrl}/blog/${article.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    articleSection: article.category,
    mainEntityOfPage: canonical,
    author: { "@type": "Organization", name: "JoyHeart Editorial Team" },
    publisher: { "@type": "Organization", name: "JoyHeart", url: siteUrl },
    inLanguage: "en",
  };
  return (
    <main className="jh-resource-page jh-article-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="jh-resource-hero">
        <p className="public-eyebrow">The JoyHeart journal · <a href={`/blog/category/${journalCategorySlug(article.category)}`}>{article.category}</a></p>
        <h1>{article.title}</h1>
        <p>{article.intro}</p>
        <span className="jh-article-read-time">{article.read}</span>
      </header>
      <figure className="jh-article-hero-image"><img src={article.image} alt={article.imageAlt} fetchPriority="high" /><figcaption>{article.imageAlt}</figcaption></figure>
      <article className="jh-article-content">
        {article.sections.map(([heading, paragraphs]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </article>
      <nav className="jh-article-navigation" aria-label="Article navigation">
        <a href="/blog">← Back to the JoyHeart journal</a>
        <a href="/safety">Explore the Safety Centre</a>
      </nav>
    </main>
  );
}
