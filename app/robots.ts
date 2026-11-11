import type { MetadataRoute } from "next";

const siteUrl = "https://joyheart.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about/", "/how-it-works", "/safety", "/help", "/faq", "/contact", "/blog"],
        disallow: [
          "/account/",
          "/discover",
          "/explore",
          "/matches",
          "/messages",
          "/members",
          "/staff",
          "/report",
          "/login",
          "/signup",
          "/register",
          "/reset-password",
          "/auth",
          "/api",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl,
  };
}
