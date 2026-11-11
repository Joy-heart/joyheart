import ServicesPage, { type ServiceKey } from "@/app/components/public/ServicesPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";

export const metadata = createPublicPageMetadata(
  "Profile Building | JoyHeart Services",
  "Build a thoughtful JoyHeart profile with your story, interests, preferences and approved photographs.",
  "/services/profile-building",
);

export default function Page() {
  return <ServicesPage page={"profile-building" as ServiceKey} />;
}
