import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/app/lib/public-page-metadata";
import Journal from "@/app/components/public/Journal";
import "@/app/components/public/resources.css";
export const metadata = createPublicPageMetadata("JoyHeart Journal | Dating and Relationship Advice", "Practical dating advice, healthy relationship guidance, profile tips and online dating safety from JoyHeart.", "/blog");
export default function Page() { return <Journal />; }
