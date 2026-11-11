import type { Metadata } from "next";

const siteUrl = "https://joyheart.app";

/** Consistent canonical and page-specific share metadata for public routes. */
export function createPublicPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const canonical = new URL(path, siteUrl).toString();
  const socialTitle = title.includes("JoyHeart") ? title : `${title} | JoyHeart`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "JoyHeart",
      title: socialTitle,
      description,
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
    },
  };
}
