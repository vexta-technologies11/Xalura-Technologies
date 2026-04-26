import type { Metadata } from "next";
import Link from "next/link";
import { ReportToolClient } from "@/components/ai-tools/ReportToolClient";

export const metadata: Metadata = {
  title: "AI report builder | Xalura Tech",
  description: "Turn notes into a structured report. Use your browser’s print dialog to save as PDF.",
};

export default function AiToolsReportPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All AI tools
      </Link>
      <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
        Report builder
      </h1>
      <p className="body-text" style={{ marginTop: 0, marginBottom: 28, maxWidth: 640, opacity: 0.9 }}>
        Paste rough notes or bullet facts; the model assembles a professional report. When you are ready,{" "}
        <strong>Print / save as PDF</strong> uses the system print dialog (choose “Save as PDF” on macOS).
      </p>
      <ReportToolClient />
    </section>
  );
}
