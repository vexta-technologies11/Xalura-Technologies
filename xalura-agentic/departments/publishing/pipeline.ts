import {
  runDepartmentPipeline,
  type DepartmentPipelineInput,
  type DepartmentPipelineResult,
} from "../../lib/runDepartmentPipeline";

export type PublishingPipelineInput = DepartmentPipelineInput;
export type PublishingPipelineResult = DepartmentPipelineResult;

export async function runPublishingPipeline(
  input: PublishingPipelineInput,
): Promise<PublishingPipelineResult> {
  return runDepartmentPipeline({
    departmentId: "publishing",
    departmentLabel: "Publishing",
    taskType: "Article",
    executiveStoreLabel: "Publishing",
    input,
  });
}
