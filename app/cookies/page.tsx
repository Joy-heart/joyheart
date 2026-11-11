import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Cookie Policy", "Learn how JoyHeart uses essential browser storage and how to manage optional cookie and tracking preferences.", "/cookies");
export default function Page() { return <PublicPage page="cookies" />; }
