import { readJsonFile, writeJsonFile } from "./contentWorkflow/jsonStore";
import { CONTENT_VERTICALS } from "./contentWorkflow/contentVerticals";
import { incrementalCadencePath } from "./contentWorkflow/paths";

export type IncrementalCadenceFile = {
  version: 1;
  /** Increments each hourly tick; used to round-robin verticals. */
  hour_tick_index: number;
  last_hourly_at: string | null;
};

const EMPTY: IncrementalCadenceFile = {
  version: 1,
  hour_tick_index: 0,
  last_hourly_at: null,
};

export function readIncrementalCadence(cwd: string): IncrementalCadenceFile {
  return readJsonFile(incrementalCadencePath(cwd), EMPTY);
}

/**
 * Advance cadence and return the **next** vertical id for this hour's incremental run.
 */
export function nextVerticalForHourlyTick(cwd: string): {
  vertical_id: string;
  vertical_label: string;
  tick: number;
} {
  const cur = readIncrementalCadence(cwd);
  const tick = cur.hour_tick_index + 1;
  const v = CONTENT_VERTICALS[(tick - 1) % CONTENT_VERTICALS.length]!;
  const next: IncrementalCadenceFile = {
    version: 1,
    hour_tick_index: tick,
    last_hourly_at: new Date().toISOString(),
  };
  writeJsonFile(incrementalCadencePath(cwd), next);
  return { vertical_id: v.id, vertical_label: v.label, tick };
}
