const ITEMS = [
  "Machine Learning",
  "Autonomous Systems",
  "Human-Centered AI",
  "Diagnostic Intelligence",
  "Autonomous Content",
  "Affiliate Intelligence",
];

export function Ticker() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {doubled.map((label, i) => (
          <div key={`${label}-${i}`} className="t-item">
            <span className="t-dot" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
