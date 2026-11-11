import ServicesPage, { type ServiceKey } from "@/app/components/public/ServicesPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";

export const metadata = createPublicPageMetadata(
  "Meaningful Conversations | JoyHeart Services",
  "Learn about respectful conversations and messaging after a mutual connection on JoyHeart.",
  "/services/messaging",
);

export default function Page() {
  return <ServicesPage page={"messaging" as ServiceKey} />;
}
