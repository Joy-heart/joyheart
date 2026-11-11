import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Community Guidelines", "Read the standards for respectful communication and authentic profiles on JoyHeart.", "/community-guidelines");
export default function Page() { return <PublicPage page="guidelines" />; }
