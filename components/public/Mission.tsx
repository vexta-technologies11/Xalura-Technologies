import type { PageContentMap } from "@/types/content";

function BodyParas({ text }: { text: string }) {
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div style={{ marginTop: 16 }}>
      {parts.map((p, i) => (
        <p key={i} className="body-text" style={i > 0 ? { marginTop: 18 } : { marginTop: 0 }}>
          {p}
        </p>
      ))}
    </div>
  );
}

function MissionHeadline({ text }: { text: string }) {
  const [first, second] = text.split("\n");
  if (!second) {
    return <h2 className="h2">{text}</h2>;
  }
  const words = second.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return (
    <h2 className="h2">
      {first}
      <br />
      {words.join(" ")} <em>{last}</em>
    </h2>
  );
}

export function Mission({
  content,
  className,
}: {
  content: PageContentMap["mission"];
  className?: string;
}) {
  return (
    <section className={["mission wrap", className].filter(Boolean).join(" ")} id="mission">
      <div className="r">
        <p className="label">{content.label}</p>
        <MissionHeadline text={content.headline ?? ""} />
        <BodyParas text={content.body ?? ""} />
      </div>
    </section>
  );
}
