import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Help Centre", "Find help with getting started, profiles, discovery, matches, privacy and safety on JoyHeart.", "/help");
export default function Page() { return <PublicPage page="help" />; }
