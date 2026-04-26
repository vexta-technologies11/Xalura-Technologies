import type { Metadata } from "next";
import Link from "next/link";
import { Mail, FileText, FileBarChart2 } from "lucide-react";

export const metadata: Metadata = {
  title: "AI tools | Xalura Tech",
  description: "Email, content, and report generators with copy-paste ready output.",
};

const items = [
  {
    href: "/ai-tools/email",
    title: "Advanced email",
    blurb: "Purpose, tone, and key points in — subject line options and a full draft out.",
    icon: Mail,
  },
  {
    href: "/ai-tools/content",
    title: "Content generator",
    blurb: "Topic-driven SEO content with headings, structure, and meta notes.",
    icon: FileText,
  },
  {
    href: "/ai-tools/report",
    title: "Report builder",
    blurb: "From rough notes to a structured report. Print or save as PDF in the browser.",
    icon: FileBarChart2,
  },
] as const;

export default function AiToolsHubPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <h1 className="h1 r" style={{ marginBottom: 12, fontSize: "clamp(1.75rem, 2.4vw, 2.1rem)" }}>
        AI tools
      </h1>
      <div className="ai-tools-hero">
        <p>
          All tools use fast, single-turn generation with outputs you can copy, paste, and ship. Configure
          tone and length, then review the result before you use it.
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
