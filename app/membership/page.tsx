import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Membership Plans", "Explore JoyHeart membership information and confirmed subscription details.", "/membership", false);
export default function Page() { return <PublicPage page="membership" />; }
