import type { Metadata } from "next";
import Link from "next/link";
import { NoteTaker } from "@/components/tools/NoteTaker/NoteTaker";

export const metadata: Metadata = {
  title: "Note Taker | Xalura Tech",
  description: "Clean up messy lecture notes, highlight key terms, and organize by topic.",
};

export default function NoteTakerPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          📓 Note Taker
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Paste messy lecture or meeting notes and get clean, organized notes with bolded key terms, topic grouping, and more. Supports PDF, DOCX upload.
        </p>
      </div>
      <NoteTaker />
    </section>
  );
}
