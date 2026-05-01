export interface DataCleanupParams {
  rawData: string;
  cleanupType: "deduplicate" | "standardize" | "extract" | "csv-clean" | "custom";
  customRules?: string;
  extractPattern?: string;
  isPro: boolean;
}

export function buildDataCleanupPrompt(params: DataCleanupParams): string {
  const { rawData, cleanupType, customRules, extractPattern, isPro } = params;

  const typeDescriptions: Record<string, string> = {
    "deduplicate": "Remove duplicate entries, keeping unique values only",
    "standardize": "Standardize format (names, emails, phone numbers, dates)",
    "extract": `Extract specific patterns: ${extractPattern || "emails, phone numbers, dates"}`,
    "csv-clean": "Clean CSV/TSV tabular data, fix formatting, handle missing values",
    "custom": `Custom rules: ${customRules || "N/A"}`,
  };

  return `You are a data cleanup assistant. Process and clean the following data.

RAW DATA:
${rawData.slice(0, 20000)}

CLEANUP TYPE: ${cleanupType}
${typeDescriptions[cleanupType]}
${isPro ? "MODE: Pro (include validation report, export-ready CSV)" : "MODE: Free (basic cleanup)"}

Return valid JSON only:
{
  "cleanedData": "The cleaned data as formatted text",
  "originalCount": number,
  "cleanedCount": number,
  "removedCount": number,
  "changes": [
    {"description": "What was changed/fixed"}
  ],
  ${isPro ? `"validationReport": {
    "totalRows": number,
    "validRows": number,
    "issues": [
      {"row": number, "field": "field name", "issue": "Description of issue"}
    ]
  },
  "exportCsv": "Comma-separated string ready for CSV export",` : ""}
  "categories": ["Category labels if applicable"]
}`;
}
