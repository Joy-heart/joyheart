import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "JoyHeart — Global Dating & Meaningful Connections",
    short_name: "JoyHeart",
    description: "Meet people, build genuine connections and explore meaningful relationships with JoyHeart.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#fff8f4",
    theme_color: "#641d3b",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/pwa-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/pwa-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/pwa-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
