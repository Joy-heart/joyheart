import type { Metadata } from "next";
import Journal from "@/app/components/public/Journal";
import "@/app/components/public/resources.css";
export const metadata: Metadata = { title: "JoyHeart Journal | Dating and Relationship Advice", description: "Practical dating advice, healthy relationship guidance, profile tips and online dating safety from JoyHeart.", alternates: { canonical: "https://joyheart.app/blog" } };
export default function Page() { return <Journal />; }
