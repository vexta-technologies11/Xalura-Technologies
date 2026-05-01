import type { Metadata } from "next";
import Link from "next/link";
import { EssayOutliner } from "@/components/tools/EssayOutliner/EssayOutliner";

export const metadata: Metadata = {
  title: "Essay Outliner | Xalura Tech",
  description: "Turn any topic into a structured essay outline with thesis, body points, and conclusion.",
};

export default function EssayOutlinerPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          📝 Essay Outliner
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Turn a topic into a complete essay outline with thesis, structured body sections, counter-arguments (Pro), and evidence gap detection (Pro).
        </p>
      </div>
      <EssayOutliner />
    </section>
  );
}
