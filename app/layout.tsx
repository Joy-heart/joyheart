import type { Metadata } from "next";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import ConsentManager from "./components/public/ConsentManager";
import "./globals.css";
import "./components/public/resources.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://joyheart.app"),
  alternates: { canonical: "/" },
  title: { default: "JoyHeart — Where Hearts Find Happiness", template: "%s | JoyHeart" },
  description: "Meet people with intention. JoyHeart is an international dating and matchmaking community built around genuine connections, trust, and meaningful relationships.",
  applicationName: "JoyHeart",
  icons: { icon: "/joyheart-mark.svg", shortcut: "/joyheart-mark.svg" },
  keywords: ["international dating","matchmaking","meaningful relationships","dating community","JoyHeart"],
  openGraph: { type: "website", url: "https://joyheart.app", siteName: "JoyHeart", title: "JoyHeart — Where Hearts Find Happiness", description: "Meet people with intention and discover meaningful connections across the world." },
  twitter: { card: "summary", title: "JoyHeart — Where Hearts Find Happiness", description: "Meet people with intention and discover meaningful connections across the world." }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader />{children}<SiteFooter /><ConsentManager /></body></html>;
}
