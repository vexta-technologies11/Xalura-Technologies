import type { Metadata } from "next";
import Link from "next/link";
import { DataCleanup } from "@/components/tools/DataCleanup/DataCleanup";

export const metadata: Metadata = {
  title: "Data Cleanup Tool | Xalura Tech",
  description: "Clean messy data — deduplicate, standardize format, extract patterns, and validate CSV files.",
};

export default function DataCleanupPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">← All everyday tools</Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>🧹 Data Cleanup Tool</h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>Deduplicate, standardize, extract patterns, or apply custom rules to messy data. Pro includes validation reports.</p>
      </div>
      <DataCleanup />
    </section>
  );
}
