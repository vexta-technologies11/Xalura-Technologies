import type { Metadata } from "next";
import Link from "next/link";
import { DocumentSummarizer } from "@/components/tools/DocumentSummarizer/DocumentSummarizer";

export const metadata: Metadata = {
  title: "Document Summarizer | Xalura Tech",
  description: "Compress any document into key insights, key points, takeaways, and Q&A.",
};

export default function SummarizerPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          🔍 Document Summarizer
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Paste any document, report, or article and get a structured summary with key points,
          takeaways, and Q&A — in seconds.
        </p>
      </div>
      <DocumentSummarizer />
    </section>
  );
}
