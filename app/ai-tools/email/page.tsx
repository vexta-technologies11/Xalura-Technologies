import type { Metadata } from "next";
import Link from "next/link";
import { EmailToolClient } from "@/components/ai-tools/EmailToolClient";

export const metadata: Metadata = {
  title: "Email generator | Xalura Tech",
  description: "Generate subject line options and a full draft from a short brief.",
};

export default function AiToolsEmailPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
        Email generator
      </h1>
      <p className="body-text" style={{ marginTop: 0, marginBottom: 28, maxWidth: 640, opacity: 0.9 }}>
        Describe the situation in your own words, pick tone and length, and get something you can paste into
        your mail app and adjust in a minute.
      </p>
      <EmailToolClient />
    </section>
  );
}
