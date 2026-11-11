import ServicesPage, { type ServiceKey } from "@/app/components/public/ServicesPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";

export const metadata = createPublicPageMetadata(
  "Safety and Privacy | JoyHeart Services",
  "Learn how to protect personal information, manage boundaries and use JoyHeart safety tools.",
  "/services/safety-and-privacy",
);

export default function Page() {
  return <ServicesPage page={"safety-and-privacy" as ServiceKey} />;
}
