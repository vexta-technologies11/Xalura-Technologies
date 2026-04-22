/**
 * CLI JSON status (same shape as GET /api/agentic-health).
 * npm run agentic:status
 */
import { getAgenticHealth } from "../lib/agenticStatus";

console.log(JSON.stringify(getAgenticHealth(process.cwd()), null, 2));
