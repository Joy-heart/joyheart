import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("About JoyHeart", "Learn about JoyHeart, our mission, values and commitment to meaningful international connections.", "/about");
export default function Page() { return <PublicPage page="about" />; }
