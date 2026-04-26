import type { Metadata } from "next";
import Link from "next/link";
import { ContentToolClient } from "@/components/ai-tools/ContentToolClient";

export const metadata: Metadata = {
  title: "Content generator | Xalura Tech",
  description: "Turn a short brief into structured, web-ready copy with clear headings.",
};

export default function AiToolsContentPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
        Content generator
      </h1>
      <p className="body-text" style={{ marginTop: 0, marginBottom: 28, maxWidth: 640, opacity: 0.9 }}>
        Share what you are writing for and who it is for—get an outline, headings, and body copy you can
        refine and publish.
      </p>
      <ContentToolClient />
    </section>
  );
}
