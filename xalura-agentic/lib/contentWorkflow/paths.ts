import path from "path";
import { getAgenticRoot } from "../paths";

export function stateDir(cwd: string): string {
  return path.join(getAgenticRoot(cwd), "state");
}

export function topicBankPath(cwd: string): string {
  return path.join(stateDir(cwd), "topic-bank.json");
}

export function topicRotationPath(cwd: string): string {
  return path.join(stateDir(cwd), "topic-rotation.json");
}

export function publishedTopicsPath(cwd: string): string {
  return path.join(stateDir(cwd), "published-topics.json");
}

export function dailyProductionPath(cwd: string): string {
  return path.join(stateDir(cwd), "daily-production.json");
}

export function topicBankLastAuditPath(cwd: string): string {
  return path.join(stateDir(cwd), "topic-bank-last-audit.json");
}
