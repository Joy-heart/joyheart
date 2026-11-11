import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournalCategories, getJournalCategory } from "@/app/lib/additional-journal-articles";
import "@/app/components/public/resources.css";

const siteUrl = "https://joyheart.app";

export function generateStaticParams() {
  return getJournalCategories().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getJournalCategory(slug);
  if (!category) return { title: "Category not found | JoyHeart", robots: { index: false, follow: false } };
  const canonical = `${siteUrl}/blog/category/${category.slug}`;
  return {
    title: `${category.name} | JoyHeart Journal`,
    description: `Read JoyHeart articles about ${category.name.toLowerCase()}, thoughtful dating and meaningful connections.`,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "JoyHeart",
      title: `${category.name} | JoyHeart Journal`,
      description: `Explore published JoyHeart articles about ${category.name.toLowerCase()}.`,
    },
    robots: category.articles.length >= 2
      ? { index: true, follow: true }
      : { index: false, follow: true },
    twitter: {
      card: "summary",
      title: `${category.name} | JoyHeart Journal`,
      description: `Explore published JoyHeart articles about ${category.name.toLowerCase()}.`,
    },
  };
}

export default async function JournalCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getJournalCategory(slug);
  if (!category) notFound();

  const canonical = `${siteUrl}/blog/category/${category.slug}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "JoyHeart Journal", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: category.name, item: canonical },
    ],
  };

  return (
    <main className="jh-resource-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="jh-article-navigation">
        <Link href="/">Home</Link><span aria-hidden="true"> / </span><Link href="/blog">JoyHeart Journal</Link><span aria-hidden="true"> / </span><span aria-current="page">{category.name}</span>
      </nav>
      <header className="jh-resource-hero">
        <p className="public-eyebrow">The JoyHeart journal</p>
        <h1>{category.name}</h1>
        <p>Published guidance and thoughtful reading from JoyHeart.</p>
      </header>
      <section className="jh-journal-grid" aria-label={`${category.name} articles`}>
        {category.articles.map((article) => (
          <article className="jh-journal-card" key={article.slug}>
            <div className="jh-journal-image">
              <img src={article.image} alt={article.imageAlt} loading="lazy" decoding="async" />
            </div>
            <div className="jh-journal-card-content">
              <div className="jh-journal-card-top"><span>{article.category}</span><small>{article.read}</small></div>
              <h2><Link href={`/blog/${article.slug}`}>{article.title}</Link></h2>
              <p>{article.summary}</p>
              <Link className="jh-journal-read-link" href={`/blog/${article.slug}`}>Read article <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        ))}
      </section>
      <footer className="jh-resource-cta"><Link className="button button-primary" href="/blog">View all journal articles</Link></footer>
    </main>
  );
}
