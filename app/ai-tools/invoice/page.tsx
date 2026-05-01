import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceGenerator } from "@/components/tools/InvoiceGenerator/InvoiceGenerator";

export const metadata: Metadata = {
  title: "Invoice Generator | Xalura Tech",
  description: "Generate professional invoices and business letters with auto-calculated totals.",
};

export default function InvoicePage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          🧾 Invoice Generator
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Professional invoices and business letters with auto-calculated totals. Perfect for freelancers
          and small businesses.
        </p>
      </div>
      <InvoiceGenerator />
    </section>
  );
}
