import ServicesPage, { type ServiceKey } from "@/app/components/public/ServicesPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";

export const metadata = createPublicPageMetadata(
  "Discover People | JoyHeart Services",
  "Explore how eligible JoyHeart members can discover profiles while member privacy stays protected.",
  "/services/discover",
);

export default function Page() {
  return <ServicesPage page={"discover" as ServiceKey} />;
}
