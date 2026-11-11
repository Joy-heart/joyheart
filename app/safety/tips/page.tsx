import PublicPage from "@/app/components/public/PublicPage";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
export const metadata = createPublicPageMetadata("Dating Safety Tips", "Learn practical ways to protect your information, avoid romance scams and meet safely.", "/safety/tips");
export default function Page() { return <PublicPage page="tips" />; }
