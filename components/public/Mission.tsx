import type { PageContentMap } from "@/types/content";

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

export function Mission({ content }: { content: PageContentMap["mission"] }) {
  return (
    <section className="mission wrap" id="mission">
      <div className="r">
        <p className="label">{content.label}</p>
        <MissionHeadline text={content.headline ?? ""} />
        <p className="body-text">{content.body}</p>
      </div>
      <div className="stats r" style={{ marginTop: 40, transitionDelay: "0.15s" }}>
        <div className="stat">
          <div className="stat-n">
            4<sup>+</sup>
          </div>
          <div className="stat-l">AI Team Members</div>
        </div>
        <div className="stat">
          <div className="stat-n">
            24<sup>/7</sup>
          </div>
          <div className="stat-l">Always Working</div>
        </div>
        <div className="stat">
          <div className="stat-n">
            1<sup>st</sup>
          </div>
          <div className="stat-l">Product in Market</div>
        </div>
        <div className="stat">
          <div className="stat-n">
            0<sup>x</sup>
          </div>
          <div className="stat-l">Manual Content Work</div>
        </div>
      </div>
    </section>
  );
}
