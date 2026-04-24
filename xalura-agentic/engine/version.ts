/** Bump when a phase in docs/agentic-workflow-architecture-log.md ships. */
export const AGENTIC_IMPLEMENTATION_PHASE = 7 as const;

/**
 * Manual deploy marker when CI does not inject a commit SHA into `process.env`.
 * Bump on every agentic/health–visible release so `/api/agentic-health` proves the Worker picked up the build.
 */
export const AGENTIC_RELEASE_ID = "p7-20260424-04-imagen-predict" as const;

/** Health JSON contract version — increment when adding/removing top-level health fields. */
export const AGENTIC_HEALTH_SCHEMA = 7 as const;
