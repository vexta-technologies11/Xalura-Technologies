import {
  runDepartmentPipeline,
  type DepartmentPipelineInput,
  type DepartmentPipelineResult,
} from "../../lib/runDepartmentPipeline";

export type SeoPipelineInput = DepartmentPipelineInput;
export type SeoPipelineResult = DepartmentPipelineResult;

/** Keyword research, on-page SEO, audits — same vertical as Publishing/Marketing. */
export async function runSeoPipeline(
  input: SeoPipelineInput,
): Promise<SeoPipelineResult> {
  return runDepartmentPipeline({
    departmentId: "seo",
    departmentLabel: "SEO & Audit",
    taskType: "Keyword",
    executiveStoreLabel: "SEO & Audit",
    input,
  });
}
