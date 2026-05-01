import type { Metadata } from "next";
import Link from "next/link";
import { CaptionGenerator } from "@/components/tools/CaptionGenerator/CaptionGenerator";

export const metadata: Metadata = {
  title: "Caption Generator | Xalura Tech",
  description: "Generate platform-optimized captions for Instagram, Facebook, TikTok, LinkedIn, and more.",
};

export default function CaptionsPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          📱 Caption Generator
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Platform-optimized captions, hashtags, and hooks for every social media platform.
        </p>
      </div>
      <CaptionGenerator />
    </section>
  );
}
