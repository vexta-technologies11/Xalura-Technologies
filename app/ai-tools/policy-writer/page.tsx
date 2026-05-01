import type { Metadata } from "next";
import Link from "next/link";
import { PolicyWriter } from "@/components/tools/PolicyWriter/PolicyWriter";

export const metadata: Metadata = {
  title: "Policy Writer | Xalura Tech",
  description: "Draft company policies with structured sections, version control, and legal disclaimers.",
};

export default function PolicyWriterPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">← All everyday tools</Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>📜 Policy Writer</h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Draft professional company policies with structured sections, version control (Pro), and legal disclaimers (Pro).
        </p>
      </div>
      <PolicyWriter />
    </section>
  );
}
