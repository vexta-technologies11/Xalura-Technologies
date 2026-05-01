import type { Metadata } from "next";
import Link from "next/link";
import { PresentationBuilder } from "@/components/tools/PresentationBuilder/PresentationBuilder";

export const metadata: Metadata = {
  title: "Presentation Builder | Xalura Tech",
  description: "Turn any topic into a full slide deck with 7 layout types and speaker notes.",
};

export default function PresentationPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          📊 Presentation Builder
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Create full slide decks from any topic. Choose from 7 layout types, add speaker notes, and
          reorder with drag-and-drop.
        </p>
      </div>
      <PresentationBuilder />
    </section>
  );
}
