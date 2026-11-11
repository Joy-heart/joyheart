import ServicesPage, { type ServiceKey } from "@/app/components/public/ServicesPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";

export const metadata = createPublicPageMetadata(
  "Verified Profiles and Photo Review | JoyHeart Services",
  "Understand JoyHeart account safeguards, profile-photo moderation and member reporting.",
  "/services/verified-profiles",
);

export default function Page() {
  return <ServicesPage page={"verified-profiles" as ServiceKey} />;
}
