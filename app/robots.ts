import type { MetadataRoute } from "next";

const siteUrl = "https://joyheart.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Keep pages crawlable so their noindex directives can be discovered.
        // robots.txt is not an access-control mechanism; private routes must
        // enforce authentication and authorization in the application.
        disallow: ["/api/", "/auth/callback"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
