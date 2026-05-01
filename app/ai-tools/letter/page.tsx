import type { Metadata } from "next";
import Link from "next/link";
import { LetterWriter } from "@/components/tools/LetterWriter/LetterWriter";

export const metadata: Metadata = {
  title: "Letter Writer | Xalura Tech",
  description: "Generate any personal or formal letter — complaint, request, appeal, thank you, and more.",
};

export default function LetterWriterPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          ✍️ Letter Writer
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Any letter for any occasion. Describe what you need, pick your tone, and get a professionally
          formatted letter ready to send.
        </p>
      </div>
      <LetterWriter />
    </section>
  );
}
