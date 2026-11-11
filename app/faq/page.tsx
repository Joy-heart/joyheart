import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
import InteractiveFaq from "@/app/components/public/InteractiveFaq";
import "@/app/components/public/resources.css";
export const metadata = createPublicPageMetadata("Frequently Asked Questions", "Search answers about JoyHeart accounts, profiles, discovery, matching, membership and dating safety.", "/faq");
export default function Page() { return <InteractiveFaq />; }
