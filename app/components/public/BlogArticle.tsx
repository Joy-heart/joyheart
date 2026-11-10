"use client";
import { useRouter } from "next/navigation";
export default function BlogArticle() {
  const router = useRouter();
  return <main className="public-page"><header className="public-page-hero"><p className="public-eyebrow">The JoyHeart journal</p><h1>Article not found.</h1><p>That article is not available. We only publish articles after they have been reviewed and approved.</p><button className="button button-primary" onClick={() => router.push("/blog")}>Back to the journal</button></header></main>;
}
