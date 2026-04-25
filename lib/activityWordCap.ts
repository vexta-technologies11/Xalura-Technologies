/** Count words (whitespace-delimited) for live activity feed cap. */
export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * Keep a **newest-first** list of line strings; drop oldest items when the total
 * would exceed `maxWords` (no full memory wipe — only trim from the old end).
 */
export function capNewestFirstLinesToWordBudget(
  linesNewestFirst: string[],
  maxWords: number,
): string[] {
  if (maxWords <= 0) return [];
  const out: string[] = [];
  let used = 0;
  for (const line of linesNewestFirst) {
    const w = countWords(line);
    if (w === 0) {
      out.push(line);
      continue;
    }
    if (used + w > maxWords && out.length > 0) break;
    if (used + w > maxWords && out.length === 0) {
      const words = line.trim().split(/\s+/);
      const take = words.slice(0, maxWords).join(" ");
      out.push(take + (words.length > maxWords ? "…" : ""));
      break;
    }
    used += w;
    out.push(line);
  }
  return out;
}
