import ServicesPage from "@/app/components/public/ServicesPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";

export const metadata = createPublicPageMetadata(
  "Dating and Matching Services",
  "Explore JoyHeart services: compatibility matching, member discovery, messaging, profile building, photo review, safety and thoughtful dating guidance.",
  "/services",
);

export default function Page() {
  return <ServicesPage />;
}
