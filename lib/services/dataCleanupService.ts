import type { DataCleanupParams } from "./prompts/dataCleanupPrompt";

export interface DataCleanupResult {
  cleanedData: string;
  originalCount: number;
  cleanedCount: number;
  removedCount: number;
  changes: { description: string }[];
  validationReport?: {
    totalRows: number;
    validRows: number;
    issues: { row: number; field: string; issue: string }[];
  };
  exportCsv?: string;
  categories: string[];
}

export async function cleanupData(params: DataCleanupParams): Promise<DataCleanupResult> {
  const res = await fetch("/api/tools/data-cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
