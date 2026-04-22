/**
 * Simulates 10 approvals for `publishing` → writes cycle-1..10.md + audit-cycle-1.md
 * Run from repo root: npm run agentic:cycle-demo
 */
import { recordApproval } from "../engine/cycleEngine";
import { writeChiefDailyReport } from "../engine/chiefStub";

const dept = "publishing" as const;

for (let i = 1; i <= 10; i += 1) {
  const r = recordApproval({
    department: dept,
    taskType: "Article",
    inputSummary: `Demo approval ${i}/10`,
    outputSummary: `Stub worker output ${i}`,
    managerReason: "Demo run",
  });
  console.log(`Approval ${i}: ${r.cycleFileRelative}${r.auditTriggered ? ` → ${r.auditFileRelative}` : ""}`);
}

const report = writeChiefDailyReport();
console.log(`Chief stub report: ${report}`);
