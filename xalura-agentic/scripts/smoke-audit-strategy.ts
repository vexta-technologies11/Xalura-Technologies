/**
 * Smoke: audit strategy overlay store + preamble + (optional) full enrichment.
 *
 * No network (fast, CI-friendly):
 *   SMOKE_SKIP_NETWORK=1 npx tsx xalura-agentic/scripts/smoke-audit-strategy.ts
 *
 * With .env (Serp + Firecrawl + Gemini for Executive):
 *   npx tsx --env-file=.env.local xalura-agentic/scripts/smoke-audit-strategy.ts
 */
import { runStrategicAuditEnrichment } from "../lib/auditStrategyEnrichment";
import {
  formatStrategyPreamble,
  loadStrategyOverlay,
  type AuditStrategyOverlayV1,
  saveStrategyOverlay,
} from "../lib/auditStrategyOverlayStore";
import { serpApiConfigured } from "../lib/contentWorkflow/serpApiSearch";
import { getPhase7Configured } from "../lib/phase7Clients";
import { isGeminiConfigured } from "../lib/gemini";

const cwd = process.cwd();
const LANE = "sc-smoke-test-lane";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

function main() {
  const skipNet = process.env["SMOKE_SKIP_NETWORK"] === "1";

  const sample: AuditStrategyOverlayV1 = {
    version: 1,
    updatedAt: new Date().toISOString(),
    auditFileRelative: "logs/seo/audit-cycle-smoke.md",
    department: "seo",
    agentLaneKey: `seo:${LANE}`,
    directive: "OPTIMIZE",
    seo_positioning:
      "Reframe research toward current *hot* subtopics and angles for the fixed pillar; avoid generic 'best of' listicles.",
    seo_serp_query_hint: "trends 2025",
    publishing_template: "",
    marketing_positioning: "",
    world_evidence: {
      serp_query: "smoke query",
      serp_titles: ["Title A", "Title B"],
      firecrawl_excerpt: "excerpt",
    },
  };

  saveStrategyOverlay(cwd, sample);
  const back = loadStrategyOverlay(cwd, "seo", LANE);
  assert(!!back, "loadStrategyOverlay should return saved overlay for lane");
  assert(
    back!.seo_positioning === sample.seo_positioning,
    "round-trip seo_positioning",
  );
  assert(
    back!.agentLaneKey === `seo:${LANE}`,
    "round-trip agentLaneKey",
  );

  const preamble = formatStrategyPreamble("seo", back!);
  assert(
    preamble.includes("Executive / Chief strategy overlay"),
    "preamble should include strategy overlay header",
  );
  assert(
    preamble.includes("OPTIMIZE") && preamble.includes("smoke query"),
    "preamble should include directive and serp query",
  );

  console.log("OK — store round-trip + formatStrategyPreamble (seo lane)");

  if (skipNet) {
    console.log("OK — SMOKE_SKIP_NETWORK=1 (skipping runStrategicAuditEnrichment)");
    process.exit(0);
  }

  void (async () => {
    const [p7, gem, serp] = await Promise.all([
      getPhase7Configured(),
      isGeminiConfigured(),
      serpApiConfigured(),
    ]);
    console.log("Phase7:", p7, "| Gemini:", gem, "| SerpAPI:", serp);

    await runStrategicAuditEnrichment({
      cwd,
      department: "seo",
      agentLaneKey: `seo:${LANE}`,
      chiefLiveMarkdown: [
        "## Chief score",
        "7",
        "## Directive",
        "OPTIMIZE — tighten topical focus next window.",
        "## Strategy note",
        "Bias toward hot subtopic discovery without leaving the assigned pillar.",
      ].join("\n"),
      auditFileRelative: "logs/seo/audit-cycle-smoke-enrich.md",
      strategyContext: {
        keyword: "security trust AI",
        subcategory: "AI Security",
        verticalLabel: "Security and trust",
      },
    });

    const after = loadStrategyOverlay(cwd, "seo", LANE);
    assert(!!after, "overlay should exist after enrichment");
    assert(
      (after!.updatedAt >= sample.updatedAt) || after!.world_evidence.serp_query.length > 0,
      "enrichment should update overlay or set world_evidence",
    );
    console.log("OK — runStrategicAuditEnrichment completed; check data/audit-strategy-overlays.json");
    process.exit(0);
  })().catch((e) => {
    console.error("FAIL:", e);
    process.exit(1);
  });
}

main();
