import Link from "next/link";
import { Mail, FileText, FileBarChart2 } from "lucide-react";

const cards = [
  {
    href: "/ai-tools/email",
    label: "Advanced email",
    blurb: "Subject lines, tone, and a ready-to-send draft from your key points.",
    icon: Mail,
  },
  {
    href: "/ai-tools/content",
    label: "Content generator",
    blurb: "SEO-oriented articles and landing copy with clear headings and structure.",
    icon: FileText,
  },
  {
    href: "/ai-tools/report",
    label: "Report builder",
    blurb: "Executive-style reports you can print or save as PDF from the browser.",
    icon: FileBarChart2,
  },
] as const;

/**
 * Public homepage: AI tools hub teaser (see-through glass to match `home-na` / starfield).
 */
export function HomeAiToolsTeaser() {
  return (
    <section id="ai-tools" className="home-ai wrap" style={{ scrollMarginTop: 96, paddingTop: 40, paddingBottom: 8 }}>
      <p className="label r" style={{ marginBottom: 6 }}>
        AI tools
      </p>
      <h2
        className="h2 r"
        style={{
          fontSize: "clamp(1.45rem, 2.1vw, 1.7rem)",
          maxWidth: 700,
          marginTop: 0,
          marginBottom: 8,
        }}
      >
        Copy-paste ready drafts
      </h2>
      <p className="body-text" style={{ maxWidth: 640, marginTop: 0, marginBottom: 28, opacity: 0.9 }}>
        Email, long-form content, and printable reports — powered on our stack with clear outputs you can
        use immediately.{" "}
        <Link href="/ai-tools" className="home-ai__all">
          All tools
        </Link>
      </p>
      <ul className="home-ai__grid" role="list">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.href}>
              <Link className="home-ai__card" href={c.href}>
                <span className="home-ai__icon" aria-hidden>
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <span className="home-ai__card-title">{c.label}</span>
                <span className="home-ai__card-blurb">{c.blurb}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
