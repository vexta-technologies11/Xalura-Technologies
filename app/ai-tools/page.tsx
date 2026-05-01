import type { Metadata } from "next";
import Link from "next/link";
import { TOOLS } from "@/lib/data/tools";
import { getToolCategories } from "@/lib/data/toolCategories";

export const metadata: Metadata = {
  title: "Everyday tools | Xalura Tech",
  description: "Email, content, and report helpers with copy-paste ready output.",
};

export default async function AiToolsHubPage() {
  const categories = await getToolCategories();

  // Collect tool IDs already assigned to any category so we don't double-render them
  const assignedToolIds = new Set<string>();
  for (const cat of categories) {
    for (const item of cat.items) {
      assignedToolIds.add(item.tool_id);
    }
  }

  // Find unassigned TOOLS
  const unassignedTools = TOOLS.filter((t) => !assignedToolIds.has(t.id));

  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <h1 className="h1 r" style={{ marginBottom: 12, fontSize: "clamp(1.75rem, 2.4vw, 2.1rem)" }}>
        Everyday tools
      </h1>
      <div className="ai-tools-hero">
        <p>
          One place to describe what you need; the rest is a few quick choices. Copy the result, tweak it,
          and use it the same day.
        </p>
      </div>

      {/* Dynamically loaded categories from Supabase */}
      {categories.map((cat) => {
        const catTools = cat.items
          .map((item) => {
            const tool = TOOLS.find((t) => t.id === item.tool_id);
            return tool ? { ...tool, display_order: item.display_order } : null;
          })
          .filter(Boolean)
          .sort((a, b) => a!.display_order - b!.display_order);

        if (catTools.length === 0) return null;

        return (
          <div key={cat.id}>
            <h2
              className="h2 r"
              style={{
                marginBottom: 12,
                fontSize: "clamp(1.1rem, 1.5vw, 1.25rem)",
                marginTop: 36,
              }}
            >
              {cat.name}
            </h2>
            <ul className="ai-tools-hub" role="list">
              {catTools.map((tool) => (
                <li key={tool!.id}>
                  <Link className="ai-tools-hub__link" href={tool!.route}>
                    <span className="ai-tools-hub__title">{tool!.name}</span>
                    <p className="ai-tools-hub__blurb">{tool!.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Any TOOLS not assigned to a category — shown under "Other" */}
      {unassignedTools.length > 0 && (
        <div>
          {categories.length > 0 && (
            <h2
              className="h2 r"
              style={{
                marginBottom: 12,
                fontSize: "clamp(1.1rem, 1.5vw, 1.25rem)",
                marginTop: 36,
              }}
            >
              Other
            </h2>
          )}
          <ul className="ai-tools-hub" role="list">
            {unassignedTools.map((tool) => (
              <li key={tool.id}>
                <Link className="ai-tools-hub__link" href={tool.route}>
                  <span className="ai-tools-hub__title">{tool.name}</span>
                  <p className="ai-tools-hub__blurb">{tool.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="body-text" style={{ marginTop: 32, opacity: 0.85, fontSize: "0.9rem" }}>
        <Link className="ai-tools__back" href="/" style={{ borderBottom: 0, padding: 0 }}>
          ← Home
        </Link>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <Link className="ai-tools__back" href="/pricing" style={{ borderBottom: 0, padding: 0 }}>
          Pricing
        </Link>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <Link className="ai-tools__back" href="/outputs" style={{ borderBottom: 0, padding: 0 }}>
          Saved Outputs
        </Link>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <Link className="ai-tools__back" href="/settings" style={{ borderBottom: 0, padding: 0 }}>
          Settings
        </Link>
      </p>
    </section>
  );
}
