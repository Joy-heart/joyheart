import type { MetadataRoute } from "next";
import { additionalJournalArticles, getJournalCategories } from "@/app/lib/additional-journal-articles";

const siteUrl = "https://joyheart.app";

/**
 * Only canonical, public, indexable pages belong in this sitemap.
 * Authenticated member pages, private reports, account routes, and empty
 * dynamic article routes are deliberately excluded.
 */
const publicRoutes = [
  "/",
  "/about",
  "/about/mission",
  "/how-it-works",
  "/success-stories",
  "/membership",
  "/premium",
  "/safety",
  "/safety/tips",
  "/help",
  "/faq",
  "/contact",
  "/blog",
  "/privacy-policy",
  "/terms",
  "/cookies",
  "/community-guidelines",
  "/account-deletion",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const categoryRoutes = getJournalCategories()
    .filter((category) => category.articles.length >= 2)
    .map((category) => `/blog/category/${category.slug}`);
  const articleRoutes = additionalJournalArticles.map((article) => `/blog/${article.slug}`);
  const uniqueRoutes = [...new Set([...publicRoutes, ...articleRoutes, ...categoryRoutes])];
  return uniqueRoutes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/safety" || route === "/how-it-works" ? 0.9 : 0.6,
  }));
}
