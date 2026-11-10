import type { Metadata } from "next";
import InteractiveFaq from "@/app/components/public/InteractiveFaq";
import "@/app/components/public/resources.css";
export const metadata: Metadata = { title: "Frequently Asked Questions", description: "Search answers about JoyHeart accounts, profiles, discovery, matching, membership and dating safety.", alternates: { canonical: "https://joyheart.app/faq" } };
export default function Page() { return <InteractiveFaq />; }
