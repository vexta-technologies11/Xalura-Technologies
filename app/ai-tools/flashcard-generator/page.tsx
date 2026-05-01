import type { Metadata } from "next";
import Link from "next/link";
import { FlashcardGenerator } from "@/components/tools/FlashcardGenerator/FlashcardGenerator";

export const metadata: Metadata = {
  title: "Flashcard Generator | Xalura Tech",
  description: "Turn study notes into Q&A, fill-in-blank, or multiple choice flashcards.",
};

export default function FlashcardGeneratorPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          🃏 Flashcard Generator
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Turn any study material into interactive flashcards. Supports Q&A, fill-in-the-blank, and multiple choice formats. Upload PDFs and DOCX files.
        </p>
      </div>
      <FlashcardGenerator />
    </section>
  );
}
