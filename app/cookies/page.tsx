import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Cookie Policy", "Understand browser cookies and similar technologies used by JoyHeart.", "/cookies");
export default function Page() { return <PublicPage page="cookies" />; }
