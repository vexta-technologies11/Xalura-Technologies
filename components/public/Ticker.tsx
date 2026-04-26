import { DEFAULT_PAGE_CONTENT } from "@/lib/constants";

const FALLBACK: string[] = DEFAULT_PAGE_CONTENT.homePage.tickerItems
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

function itemsFromCms(s: string | undefined): string[] {
  if (!s?.trim()) return FALLBACK;
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

type Props = {
  className?: string;
  /** Newline-separated labels from `page_content` (home.tickerItems). */
  tickerItems?: string;
};

export function Ticker({ className, tickerItems }: Props) {
  const raw = itemsFromCms(tickerItems);
  const doubled = [...raw, ...raw];
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
