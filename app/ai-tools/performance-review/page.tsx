import type { Metadata } from "next";
import Link from "next/link";
import { PerformanceReview } from "@/components/tools/PerformanceReview/PerformanceReview";

export const metadata: Metadata = {
  title: "Performance Review Writer | Xalura Tech",
  description: "Write professional performance reviews with strengths, growth areas, SMART goals, and more.",
};

export default function PerformanceReviewPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">← All everyday tools</Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>📊 Performance Review Writer</h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Write professional performance reviews with structured strengths, growth areas, and SMART goals (Pro).
        </p>
      </div>
      <PerformanceReview />
    </section>
  );
}
