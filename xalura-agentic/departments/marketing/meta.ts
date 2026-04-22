export const departmentId = "marketing" as const;

export function describeMarketingDepartment(): string {
  return "Marketing — campaigns, posts, ads (`runMarketingPipeline` in pipeline.ts)";
}
