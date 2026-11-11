import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("How JoyHeart Works", "Learn how to create a profile, set preferences, discover people and build meaningful connections on JoyHeart.", "/how-it-works");
export default function Page() { return <PublicPage page="how" />; }
