/**
 * CLI JSON status (same shape as GET /api/agentic-health).
 * npm run agentic:status
 */
import { getAgenticHealth } from "../lib/agenticStatus";

getAgenticHealth(process.cwd())
  .then((payload) => {
    console.log(JSON.stringify(payload, null, 2));
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
