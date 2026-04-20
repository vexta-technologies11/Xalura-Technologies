import type { IconType } from "@/types/employee";
import { getRandomTerminalLine } from "./agentTerminalCode";

/** Same four keys as employee `icon_type` */
export type ActivityType = IconType;

export function getRandomActivity(type: ActivityType): string {
  return getRandomTerminalLine(type);
}

export { terminalCodePools } from "./agentTerminalCode";
