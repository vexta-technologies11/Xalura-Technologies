import type { Metadata } from "next";
import Link from "next/link";
import { ResumeBuilder } from "@/components/tools/ResumeBuilder/ResumeBuilder";

export const metadata: Metadata = {
  title: "Resume Builder | Xalura Tech",
  description: "Build ATS-optimized resumes with live scoring, professional templates, and AI-enhanced bullet points.",
};

export default function ResumePage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          🧑‍💼 Resume Builder
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Step-by-step resume builder with ATS scoring, AI-enhanced bullet points, and a matching cover
          letter. Upload your existing resume or start fresh.
        </p>
      </div>
      <ResumeBuilder />
    </section>
  );
}
