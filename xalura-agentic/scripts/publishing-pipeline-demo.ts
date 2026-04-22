/**
 * Runs one Publishing pipeline (Worker → Manager → Executive → recordApproval).
 * From repo root: npm run agentic:publishing-demo
 */
import { runPublishingPipeline } from "../departments/publishing";

async function main() {
  const res = await runPublishingPipeline({
    task:
      "Draft a short outline (3 bullet points) for an article about OBD2 readiness monitors for beginners.",
    keyword: "OBD2 readiness monitor",
  });

  if (res.status === "approved") {
    console.log("Status: APPROVED");
    console.log("Cycle file:", res.cycle.cycleFileRelative);
    if (res.cycle.auditTriggered) {
      console.log("Audit file:", res.cycle.auditFileRelative);
    }
  } else if (res.status === "rejected") {
    console.log("Status: REJECTED", res.reason);
  } else {
    console.log("Status: ERROR", res.stage, res.message);
  }
}

void main();
