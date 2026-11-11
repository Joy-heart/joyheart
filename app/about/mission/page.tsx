import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Our Mission and Vision", "Discover the mission, vision and values guiding the JoyHeart international dating community.", "/about/mission");
export default function Page() { return <PublicPage page="mission" />; }
