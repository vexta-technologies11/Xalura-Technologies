import type { Metadata } from "next";
import { ReportToolClient } from "@/components/ai-tools/ReportToolClient";

export const metadata: Metadata = {
  title: "Report builder | Xalura Tech",
  description:
    "Turn notes into a structured report with professional print templates (executive, data, invoice, guide, and more), then print or save as PDF.",
};

export default function AiToolsReportPage() {
  return (
    <section className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <ReportToolClient />
    </section>
  );
}
