import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Contact JoyHeart", "Find the appropriate support route for JoyHeart account and member safety questions.", "/contact");
export default function Page() { return <PublicPage page="contact" />; }
