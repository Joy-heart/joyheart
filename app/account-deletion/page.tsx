import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Account Deletion", "Learn how to request JoyHeart account deletion, what information may be removed or retained, and how to get assistance.", "/account-deletion");
export default function Page() { return <PublicPage page="deletion" />; }
