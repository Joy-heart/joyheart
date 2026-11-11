import type { MetadataRoute } from "next";

const siteUrl = "https://joyheart.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Public pages should remain crawlable. Private member routes are
        // protected by authentication and carry noindex metadata; blocking
        // them here would prevent crawlers from seeing those directives.
        disallow: ["/api/", "/auth/callback", "/staff/", "/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
