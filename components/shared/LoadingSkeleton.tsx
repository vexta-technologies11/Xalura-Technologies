"use client";

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: boolean;
  count?: number;
  style?: React.CSSProperties;
}

export function LoadingSkeleton({
  width = "100%",
  height = "16px",
  rounded = true,
  count = 1,
  style,
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            width,
            height,
            borderRadius: rounded ? "6px" : 0,
            background: "linear-gradient(90deg, rgba(31,31,46,0.5) 25%, rgba(31,31,46,0.8) 50%, rgba(31,31,46,0.5) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
            marginBottom: count > 1 ? "8px" : 0,
            ...style,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}

export function FormSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <LoadingSkeleton width="40%" height="20px" />
      <LoadingSkeleton height="42px" />
      <LoadingSkeleton width="30%" height="20px" />
      <LoadingSkeleton height="120px" />
      <LoadingSkeleton width="50%" height="20px" />
      <LoadingSkeleton height="42px" />
      <LoadingSkeleton width="120px" height="44px" rounded />
    </div>
  );
}

export function OutputSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <LoadingSkeleton width="50%" height="24px" />
      <LoadingSkeleton count={3} height="14px" />
      <LoadingSkeleton width="80%" height="14px" />
      <LoadingSkeleton count={2} height="14px" />
      <LoadingSkeleton width="60%" height="14px" />
    </div>
  );
}
