import type { MetadataRoute } from "next";

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
  return publicRoutes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/safety" || route === "/how-it-works" ? 0.9 : 0.6,
  }));
}
