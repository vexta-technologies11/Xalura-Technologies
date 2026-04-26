const ITEMS = [
  "Machine Learning",
  "Autonomous Systems",
  "Human-Centered AI",
  "Diagnostic Intelligence",
  "Autonomous Content",
  "Affiliate Intelligence",
];

export function Ticker({ className }: { className?: string }) {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className={["ticker", className].filter(Boolean).join(" ")}>
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
