import type { Metadata } from "next";
import Link from "next/link";
import { AITranslator } from "@/components/tools/AITranslator/AITranslator";

export const metadata: Metadata = {
  title: "AI Translator | Xalura Tech",
  description: "Translate text across 130+ languages while preserving tone and context.",
};

export default function TranslatorPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          🌐 AI Translator
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Translate text across 130+ languages while preserving tone, context, and formality.
        </p>
      </div>
      <AITranslator />
    </section>
  );
}
