import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Premium Features", "Learn about JoyHeart premium features when paid plans become available.", "/premium");
export default function Page() { return <PublicPage page="premium" />; }
