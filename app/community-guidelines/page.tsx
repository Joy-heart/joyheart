import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Community Guidelines", "Read JoyHeart's detailed standards for authentic profiles, consent, respectful communication, privacy, reporting and safety.", "/community-guidelines");
export default function Page() { return <PublicPage page="guidelines" />; }
