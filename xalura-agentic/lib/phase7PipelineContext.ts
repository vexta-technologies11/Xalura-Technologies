import type { DepartmentId } from "../engine/departments";
import {
  firecrawlScrape,
  gscSearchAnalyticsQuery,
} from "./phase7Clients";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n…(truncated)`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type Phase7WorkerExtras = Record<string, unknown>;

/**
 * Optional live data for the first Worker turn: Firecrawl (`referenceUrl`),
 * for SEO — Search Analytics top queries when GSC env is set.
 * For SEO with a topic bank row, `seoTopicResearchContext.ts` also merges **per-topic** SerpAPI + Firecrawl.
 */
export async function buildPhase7WorkerContext(args: {
  departmentId: DepartmentId;
  referenceUrl?: string;
  skipPhase7Fetch?: boolean;
}): Promise<Phase7WorkerExtras> {
  if (args.skipPhase7Fetch) return {};
  const isSeo = args.departmentId === "seo";
  const ref = args.referenceUrl?.trim();
  if (!isSeo && !ref) return {};

  const notes: string[] = [];
  const out: Phase7WorkerExtras = {};

  if (ref) {
    const fc = await firecrawlScrape(ref, ["markdown"]);
    if (fc.error) notes.push(`Firecrawl: ${fc.error}`);
    else if (fc.markdown)
      out.phase7_reference_page_markdown = truncate(fc.markdown, 6000);
  }

  if (isSeo) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 28);
    const gsc = await gscSearchAnalyticsQuery({
      startDate: isoDate(start),
      endDate: isoDate(end),
      rowLimit: 15,
    });
    if (gsc.error) notes.push(`Search Console: ${gsc.error}`);
    else if (gsc.rows?.length) {
      out.phase7_search_console_top_queries = gsc.rows.slice(0, 15);
    }
  }

  if (notes.length) out.phase7_integration_notes = notes.join(" | ");
  return out;
}
