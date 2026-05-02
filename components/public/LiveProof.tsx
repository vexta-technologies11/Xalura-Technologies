/**
 * LiveProof — trust signal bar shown right below the hero.
 * Renders a lightweight row of real-time-ish stats to show the site is active.
 */
export function LiveProof() {
  return (
    <div className="live-proof">
      <div className="live-proof__inner">
        <span className="live-proof__stat">
          <span className="live-proof__stat-icon live-proof__stat-icon--green" />
          Professional tools — <em>free to use</em>
        </span>
        <span className="live-proof__stat">
          <span className="live-proof__stat-icon live-proof__stat-icon--blue" />
          News and articles <em>published daily</em>
        </span>
        <span className="live-proof__stat">
          <span className="live-proof__stat-icon live-proof__stat-icon--amber" />
          Courses <em>coming soon</em>
        </span>
      </div>
    </div>
  );
}
