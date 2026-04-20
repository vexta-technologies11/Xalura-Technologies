"use client";

/** Seven-panel bento backdrop — CSS/SVG only, no bitmaps */
export function HeroBentoGrid() {
  return (
    <div className="hero-bento" aria-hidden>
      <div className="hero-bento-cell hero-bento-cell--l1">
        <PanelBinary />
      </div>
      <div className="hero-bento-cell hero-bento-cell--l2">
        <PanelHeatmap />
      </div>
      <div className="hero-bento-cell hero-bento-cell--m1">
        <PanelSparkline />
      </div>
      <div className="hero-bento-cell hero-bento-cell--m2">
        <PanelBars />
      </div>
      <div className="hero-bento-cell hero-bento-cell--m3">
        <PanelRing />
      </div>
      <div className="hero-bento-cell hero-bento-cell--r1">
        <PanelNetwork />
      </div>
      <div className="hero-bento-cell hero-bento-cell--r2">
        <PanelMatrix />
      </div>
    </div>
  );
}

function bitAt(r: number, c: number) {
  const x = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
  return x - Math.floor(x) > 0.45 ? "1" : "0";
}

function PanelBinary() {
  const rows = Array.from({ length: 14 }, (_, r) => (
    <div key={r} className="hero-panel-binary-row">
      {Array.from({ length: 18 }, (_, c) => (
        <span
          key={c}
          className="hero-panel-binary-bit"
          style={{ animationDelay: `${(r * 3 + c) * 0.04}s` }}
        >
          {bitAt(r, c)}
        </span>
      ))}
    </div>
  ));
  return (
    <div className="hero-panel hero-panel--binary">
      <div className="hero-panel-binary-scroll">{rows}</div>
    </div>
  );
}

function PanelHeatmap() {
  return (
    <div className="hero-panel hero-panel--heatmap">
      {Array.from({ length: 8 * 12 }).map((_, i) => (
        <span
          key={i}
          className="hero-panel-heatmap-cell"
          style={{
            animationDelay: `${(i % 17) * 0.08}s`,
            opacity: 0.15 + ((i * 7) % 10) / 25,
          }}
        />
      ))}
    </div>
  );
}

function PanelSparkline() {
  return (
    <div className="hero-panel hero-panel--spark">
      <svg viewBox="0 0 120 40" className="hero-panel-spark-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(107, 139, 245, 0.35)" />
            <stop offset="100%" stopColor="rgba(23, 64, 224, 0)" />
          </linearGradient>
        </defs>
        <path
          className="hero-panel-spark-area"
          d="M0,35 L0,28 Q15,8 30,22 T60,12 T90,18 T120,8 L120,40 L0,40 Z"
          fill="url(#sparkFill)"
        />
        <path
          className="hero-panel-spark-line"
          d="M0,28 Q15,8 30,22 T60,12 T90,18 T120,8"
          fill="none"
          stroke="rgba(107, 139, 245, 0.9)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="hero-panel-tag">throughput</span>
    </div>
  );
}

function PanelBars() {
  const h = [40, 72, 55, 88, 48, 95, 62, 78, 52, 90, 44, 68];
  return (
    <div className="hero-panel hero-panel--bars">
      <div className="hero-panel-bars-inner">
        {h.map((pct, i) => (
          <div key={i} className="hero-panel-bar-wrap">
            <span
              className="hero-panel-bar"
              style={{
                height: `${pct}%`,
                animationDelay: `${i * 0.06}s`,
              }}
            />
          </div>
        ))}
      </div>
      <span className="hero-panel-tag">live queries / s</span>
    </div>
  );
}

function PanelRing() {
  return (
    <div className="hero-panel hero-panel--ring">
      <div className="hero-panel-ring-track" />
      <div className="hero-panel-ring-fill" />
      <span className="hero-panel-ring-label">94%</span>
      <span className="hero-panel-tag">model fit</span>
    </div>
  );
}

function PanelNetwork() {
  return (
    <div className="hero-panel hero-panel--net">
      <svg viewBox="0 0 100 160" className="hero-panel-net-svg" aria-hidden>
        {[
          [50, 18],
          [22, 52],
          [78, 52],
          [50, 88],
          [18, 128],
          [82, 128],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" className="hero-panel-net-node" />
        ))}
        <path
          className="hero-panel-net-edge"
          d="M50,18 L22,52 M50,18 L78,52 M22,52 L50,88 M78,52 L50,88 M50,88 L18,128 M50,88 L82,128"
          fill="none"
        />
      </svg>
      <span className="hero-panel-tag">graph index</span>
    </div>
  );
}

function PanelMatrix() {
  const cols = 16;
  const rows = 5;
  return (
    <div className="hero-panel hero-panel--matrix">
      {Array.from({ length: rows * cols }).map((_, i) => (
        <span
          key={i}
          className="hero-panel-matrix-char"
          style={{ animationDelay: `${(i % 20) * 0.05}s` }}
        >
          {"0123456789abcdef"[i % 16]!}
        </span>
      ))}
    </div>
  );
}
