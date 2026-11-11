import AboutPage from "@/app/components/public/AboutPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
import "./about-page.css";

export const metadata = createPublicPageMetadata(
  "About JoyHeart | Love Without Borders",
  "Discover the story, mission and values behind JoyHeart, a worldwide dating platform built to help adults make meaningful connections with intention, respect and care.",
  "/about",
);

export default function Page() {
  return <AboutPage />;
}
