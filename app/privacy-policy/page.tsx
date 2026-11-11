import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Privacy Policy", "Read JoyHeart's privacy policy covering account data, profiles, matching, moderation, data sharing, retention and privacy rights.", "/privacy-policy");
export default function Page() { return <PublicPage page="privacy" />; }
