import type { Metadata } from "next";
import Link from "next/link";
import { ContentToolClient } from "@/components/ai-tools/ContentToolClient";

export const metadata: Metadata = {
  title: "AI content generator | Xalura Tech",
  description: "Topic-driven, SEO-friendly long-form and landing content with clear structure.",
};

export default function AiToolsContentPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All AI tools
      </Link>
      <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
        Content generator
      </h1>
      <p className="body-text" style={{ marginTop: 0, marginBottom: 28, maxWidth: 640, opacity: 0.9 }}>
        Provide a topic, format, and keywords. The model returns scannable structure, headings, and
        on-page elements suited for publishing workflows.
      </p>
      <ContentToolClient />
    </section>
  );
}
