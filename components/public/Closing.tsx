import type { PageContentMap } from "@/types/content";

export function Closing({ content }: { content: PageContentMap["closing"] }) {
  const parts = (content.headline ?? "").split("\n");
  const a = parts[0] ?? "";
  const b = parts[1] ?? "";
  return (
    <section
      id="closing"
      className="closing-section"
      style={{
        background: "var(--black)",
        textAlign: "center",
      }}
    >
      <p className="label r" style={{ color: "#6B8BF5", textAlign: "center" }}>
        {content.label}
      </p>
      <h2
        className="h2 r"
        style={{
          color: "white",
          textAlign: "center",
          margin: "0 auto",
          maxWidth: 600,
          transitionDelay: "0.1s",
        }}
      >
        {a}
        <br />
        <em style={{ color: "#6B8BF5" }}>{b}</em>
      </h2>
      <p
        className="body-text r"
        style={{
          color: "rgba(255,255,255,.4)",
          textAlign: "center",
          margin: "24px auto 40px",
          maxWidth: 480,
          transitionDelay: "0.2s",
        }}
      >
        {content.body}
      </p>
      <div className="r" style={{ transitionDelay: "0.3s" }}>
        <a className="btn btn-blue" href="mailto:hello@xalura.tech">
          {content.cta}
        </a>
      </div>
    </section>
  );
}
