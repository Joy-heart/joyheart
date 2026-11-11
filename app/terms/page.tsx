import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Terms of Service", "Read the JoyHeart Terms of Service covering eligibility, accounts, member content, conduct, safety, moderation and service limitations.", "/terms");
export default function Page() { return <PublicPage page="terms" />; }
