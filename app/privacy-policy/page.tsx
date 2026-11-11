import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Privacy Policy", "Learn how JoyHeart handles account, profile and member information. Review the current privacy notice.", "/privacy-policy");
export default function Page() { return <PublicPage page="privacy" />; }
