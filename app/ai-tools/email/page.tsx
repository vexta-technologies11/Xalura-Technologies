import type { Metadata } from "next";
import Link from "next/link";
import { EmailToolClient } from "@/components/ai-tools/EmailToolClient";

export const metadata: Metadata = {
  title: "AI email generator | Xalura Tech",
  description: "Generate business email subject lines and a full draft from your purpose and key points.",
};

export default function AiToolsEmailPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All AI tools
      </Link>
      <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
        Advanced email
      </h1>
      <p className="body-text" style={{ marginTop: 0, marginBottom: 28, maxWidth: 640, opacity: 0.9 }}>
        Set purpose, audience, and tone. You get numbered subject line options and a full body you can
        paste into your mail client.
      </p>
      <EmailToolClient />
    </section>
  );
}
