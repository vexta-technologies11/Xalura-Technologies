export function Dashboard() {
  return (
    <section className="wrap" id="dashboard">
      <p className="label r">Control Layer</p>
      <h2 className="h2 r" style={{ transitionDelay: "0.1s" }}>
        You should always know
        <br />
        <em>what your team is up to.</em>
      </h2>
      <p
        className="body-text r"
        style={{
          transitionDelay: "0.15s",
          marginTop: 16,
          marginBottom: 48,
        }}
      >
        Managing a team means staying informed without micromanaging. The Xalura
        dashboard gives you exactly that. You can see what Kimmy flagged from
        live trends, what Mochi published, what Maldita improved on-page for SEO,
        and whether everything is running the way it should. No digging through logs.
        No guessing. Just a clear picture of where things stand.
      </p>
      <div className="dash-grid r" style={{ transitionDelay: "0.2s" }}>
        <div className="dash-card">
          <div className="dash-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M3 10h14M3 5h14M3 15h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h4 className="dash-title">Activity Log</h4>
          <p className="dash-body">
            Every time Mochi ships an article, Kimmy locks a trend brief, or
            Maldita finishes a site SEO pass, it gets logged here with a timestamp.
            Check in anytime and see what moved forward. It feels good to see the
            work piling up.
          </p>
        </div>
        <div className="dash-card">
          <div className="dash-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect
                x="3"
                y="3"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="11"
                y="3"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="3"
                y="11"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="11"
                y="11"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <h4 className="dash-title">Articles Published</h4>
          <p className="dash-body">
            A running record of everything Mochi has written. Title, keyword,
            publish date, and status. If you want to review something before it
            goes live, you can. If you trust the process and want to let it run,
            that works too. Your call.
          </p>
        </div>
        <div className="dash-card">
          <div className="dash-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M10 6v4l2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h4 className="dash-title">Trend intelligence</h4>
          <p className="dash-body">
            Kimmy live trend feed — what is rising in search and demand —
            popular queries, spikes, and what to write next. Each signal comes with
            context so you see why it hit the queue for Mochi to publish. Approve,
            skip, or let it run on autopilot.
          </p>
        </div>
        <div className="dash-card">
          <div className="dash-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M3 14l4-4 3 3 4-5 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="3"
                y="3"
                width="14"
                height="14"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <h4 className="dash-title">System Status</h4>
          <p className="dash-body">
            If something is not running right, this is where you will find out.
            No need to go hunting. Issues surface clearly so you can address
            them quickly and get back to everything else you have going on.
          </p>
        </div>
      </div>
    </section>
  );
}
