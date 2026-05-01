import type { Metadata } from "next";
import Link from "next/link";
import { CitationGenerator } from "@/components/tools/CitationGenerator/CitationGenerator";

export const metadata: Metadata = {
  title: "Citation Generator | Xalura Tech",
  description: "Generate APA, MLA, Chicago, and more citations for any source type.",
};

export default function CitationGeneratorPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          📚 Citation Generator
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Generate accurate citations in APA, MLA, Chicago, Harvard, IEEE, and more.
          Single or bulk mode. URL auto-detect available on Pro.
        </p>
      </div>
      <CitationGenerator />
    </section>
  );
}
