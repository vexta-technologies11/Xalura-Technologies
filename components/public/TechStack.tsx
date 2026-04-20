const TAGS = [
  "Vercel",
  "Cloudflare",
  "GitHub",
  "Google Search Console",
  "Resend",
  "Gemini API",
];

export function TechStack() {
  return (
    <section className="wrap tech-stack" id="technology">
      <p className="label r">Infrastructure</p>
      <h2 className="h2 r" style={{ transitionDelay: "0.1s" }}>
        Solid tools.
        <br />
        <em>No drama.</em>
      </h2>
      <p
        className="body-text r"
        style={{ transitionDelay: "0.15s", marginTop: 16, maxWidth: 600 }}
      >
        We picked tools that are reliable, well-supported, and do not require
        constant babysitting. Vercel handles deployment and keeps the site fast.
        Cloudflare sits in front for security and performance. GitHub keeps the
        codebase organized and version-controlled. Google Search Console manages
        how content gets indexed. Resend handles email, and the Gemini API
        powers the AI work. Everything has a job. Nothing is there for show.
      </p>
      <div className="stack-row r" style={{ transitionDelay: "0.2s", marginTop: 40 }}>
        {TAGS.map((t) => (
          <span key={t} className="stack-tag">
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
