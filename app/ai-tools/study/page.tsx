import type { Metadata } from "next";
import Link from "next/link";
import { StudyGuide } from "@/components/tools/StudyGuide/StudyGuide";

export const metadata: Metadata = {
  title: "Study Guide + Quiz | Xalura Tech",
  description: "Generate study guides, flashcards with 3D flip, and practice quizzes from any text.",
};

export default function StudyPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          🎓 Study Guide + Quiz
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Paste your notes and get study guides, 3D flashcards, and practice quizzes — all generated instantly.
        </p>
      </div>
      <StudyGuide />
    </section>
  );
}
