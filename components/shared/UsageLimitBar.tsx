"use client";

interface UsageLimitBarProps {
  used: number;
  limit: number;
  label?: string;
  showLabel?: boolean;
  /** Time until cooldown resets, in ms */
  cooldownMs?: number;
  /** Formatted cooldown string */
  cooldownLabel?: string;
}

export function UsageLimitBar({ used, limit, label, showLabel = true, cooldownMs = 0, cooldownLabel }: UsageLimitBarProps) {
  const isUnlimited = limit >= 999999;
  const percentage = !isUnlimited ? Math.min(100, (used / limit) * 100) : 0;
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && used >= limit;

  const barColor = isAtLimit
    ? "#ef4444"
    : isNearLimit
      ? "#f59e0b"
      : "#7c3aed";

  // Check if admin/unlimited
  if (isUnlimited) {
    return null; // Don't show usage bar for admin/unlimited users
  }

  return (
    <div style={{ width: "100%" }}>
      {showLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.72rem",
            color: isAtLimit
              ? "#ef4444"
              : isNearLimit
                ? "#f59e0b"
                : "rgba(200,210,230,0.6)",
            marginBottom: "4px",
          }}
        >
          <span>{label || "Usage"}</span>
          <span>
            {used}/{limit} today
          </span>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: "4px",
          borderRadius: "2px",
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            borderRadius: "2px",
            background: barColor,
            transition: "width 0.5s ease, background 0.3s ease",
          }}
        />
      </div>
      {isAtLimit && cooldownLabel && (
        <div
          style={{
            fontSize: "0.7rem",
            color: "#f59e0b",
            marginTop: "4px",
            fontWeight: 500,
          }}
        >
          Resets in {cooldownLabel}
        </div>
      )}
    </div>
  );
}
