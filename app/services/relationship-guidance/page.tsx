import ServicesPage, { type ServiceKey } from "@/app/components/public/ServicesPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";

export const metadata = createPublicPageMetadata(
  "Relationship Guidance | JoyHeart Services",
  "Explore practical guidance for honest communication, healthy boundaries and thoughtful dating.",
  "/services/relationship-guidance",
);

export default function Page() {
  return <ServicesPage page={"relationship-guidance" as ServiceKey} />;
}
