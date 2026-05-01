import type { Metadata } from "next";
import Link from "next/link";
import { EmailReplyGenerator } from "@/components/tools/EmailReplyGenerator/EmailReplyGenerator";

export const metadata: Metadata = {
  title: "Email Reply Generator | Xalura Tech",
  description: "Generate professional email replies for any situation — accept, decline, follow up, and more.",
};

export default function EmailReplyPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          ✉️ Email Reply Generator
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Get professional email replies tailored to your context. Choose from Accept, Decline, Follow Up, and more. Pro includes multiple variants.
        </p>
      </div>
      <EmailReplyGenerator />
    </section>
  );
}
