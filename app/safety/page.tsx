import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Safety Centre", "Practical online dating safety advice, privacy guidance and member protection tools from JoyHeart.", "/safety");
export default function Page() { return <PublicPage page="safety" />; }
