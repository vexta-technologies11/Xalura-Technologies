import {
  runDepartmentPipeline,
  type DepartmentPipelineInput,
  type DepartmentPipelineResult,
} from "../../lib/runDepartmentPipeline";

export type MarketingPipelineInput = DepartmentPipelineInput;
export type MarketingPipelineResult = DepartmentPipelineResult;

/** Campaigns, social posts, ads — same Worker → Manager → Executive → cycle as Publishing. */
export async function runMarketingPipeline(
  input: MarketingPipelineInput,
): Promise<MarketingPipelineResult> {
  return runDepartmentPipeline({
    departmentId: "marketing",
    departmentLabel: "Marketing",
    taskType: "Campaign",
    executiveStoreLabel: "Marketing",
    input,
  });
}
