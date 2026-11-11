import { redirect } from "next/navigation";
export const metadata = { title: "Member area | JoyHeart", robots: { index: false, follow: false } };
export default function MessagesPage() { redirect("/matches"); }
