import type { Metadata } from "next";
import Link from "next/link";
import { Mail, FileText, FileBarChart2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Everyday tools | Xalura Tech",
  description: "Email, content, and report helpers with copy-paste ready output.",
};

const items = [
  {
    href: "/ai-tools/email",
    title: "Email generator",
    blurb: "Tell us what the message is for—get subject line ideas and a ready-to-send draft.",
    icon: Mail,
  },
  {
    href: "/ai-tools/content",
    title: "Content generator",
    blurb: "Share the topic and intent—get structured, web-friendly copy you can edit and ship.",
    icon: FileText,
  },
  {
    href: "/ai-tools/report",
    title: "Report builder",
    blurb: "Notes in, structured document out: pick a document type (or let us infer it) and get a print-ready layout—no raw markdown hash noise.",
    icon: FileBarChart2,
  },
] as const;

export default function AiToolsHubPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <h1 className="h1 r" style={{ marginBottom: 12, fontSize: "clamp(1.75rem, 2.4vw, 2.1rem)" }}>
        Everyday tools
      </h1>
      <div className="ai-tools-hero">
        <p>
          One place to describe what you need; the rest is a few quick choices. Copy the result, tweak it,
          and use it the same day.
        </p>
      </div>
      <ul className="ai-tools-hub" role="list">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link className="ai-tools-hub__link" href={item.href}>
                <span
                  className="home-ai__icon"
                  style={{ marginBottom: 2 }}
                  aria-hidden
                >
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <span className="ai-tools-hub__title">{item.title}</span>
                <p className="ai-tools-hub__blurb">{item.blurb}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="body-text" style={{ marginTop: 32, opacity: 0.85, fontSize: "0.9rem" }}>
        <Link className="ai-tools__back" href="/" style={{ borderBottom: 0, padding: 0 }}>
          ← Home
        </Link>
      </p>
    </section>
  );
}
