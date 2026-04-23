import {
  fileExistsAgentic,
  readFileUtf8Agentic,
  writeFileUtf8Agentic,
} from "../agenticDisk";

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fileExistsAgentic(filePath)) return fallback;
    const raw = readFileUtf8Agentic(filePath);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  writeFileUtf8Agentic(filePath, JSON.stringify(data, null, 2));
}
