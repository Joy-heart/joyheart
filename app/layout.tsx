import type { Metadata } from "next";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import ConsentManager from "./components/public/ConsentManager";
import "./globals.css";
import "./components/public/resources.css";

const siteUrl = "https://joyheart.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "JoyHeart | Global Dating and Meaningful Connections",
    template: "%s | JoyHeart",
  },
  description:
    "Discover worldwide dating with JoyHeart. Meet singles, make meaningful connections and explore opportunities for love across countries and cultures.",
  applicationName: "JoyHeart",
  icons: { icon: "/joyheart-mark.svg", shortcut: "/joyheart-mark.svg" },
  keywords: [
    "JoyHeart",
    "global dating",
    "international dating",
    "meet singles worldwide",
    "meaningful relationships",
    "online dating",
  ],
  openGraph: {
    type: "website",
    siteName: "JoyHeart",
    title: "JoyHeart | Global Dating and Meaningful Connections",
    description:
      "Meet people from different countries and backgrounds, start conversations and explore meaningful connections with JoyHeart.",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "JoyHeart | Global Dating and Meaningful Connections",
    description:
      "Meet people from different countries and backgrounds, start conversations and explore meaningful connections with JoyHeart.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "JoyHeart",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/joyheart-mark.svg`,
      },
      description:
        "JoyHeart is an international dating and matchmaking platform focused on genuine connections, trust, safety and meaningful relationships.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "JoyHeart",
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <SiteHeader />
        {children}
        <SiteFooter />
        <ConsentManager />
      </body>
    </html>
  );
}
