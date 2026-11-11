import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Terms of Service", "Review the member eligibility, responsibilities and service expectations for JoyHeart.", "/terms");
export default function Page() { return <PublicPage page="terms" />; }
