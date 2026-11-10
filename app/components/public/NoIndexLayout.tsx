import type { Metadata } from "next";

export const privateRouteMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      noarchive: true,
      nosnippet: true,
    },
  },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
