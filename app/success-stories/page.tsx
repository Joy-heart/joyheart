import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Member Stories", "Read genuine JoyHeart member stories when they are approved and published.", "/success-stories", false);
export default function Page() { return <PublicPage page="stories" />; }
