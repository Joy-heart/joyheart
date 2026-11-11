import ServicesPage, { type ServiceKey } from "@/app/components/public/ServicesPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";

export const metadata = createPublicPageMetadata(
  "Smart Matching | JoyHeart Services",
  "Discover how JoyHeart uses profile details, interests and preferences to guide compatibility and mutual connections.",
  "/services/smart-matching",
);

export default function Page() {
  return <ServicesPage page={"smart-matching" as ServiceKey} />;
}
