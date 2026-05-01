"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TOOLS } from "@/lib/data/tools";

type CategoryItem = {
  id: string;
  category_id: string;
  tool_id: string;
  display_order: number;
};

type Category = {
  id: string;
  name: string;
  display_order: number;
  items: CategoryItem[];
};

const ALL_TOOLS = TOOLS.map((t) => ({ id: t.id, name: t.name }));

export function ToolCategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newCatName, setNewCatName] = useState("");

  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: cats, error } = await supabase
      .from("tool_categories")
      .select("*, items:tool_category_items(*)")
      .order("display_order", { ascending: true });

    if (error) {
      setMsg({ type: "err", text: error.message });
    } else {
      setCategories(
        (cats || []).map((c: any) => ({
          ...c,
          items: (c.items || []).sort((a: any, b: any) => a.display_order - b.display_order),
        }))
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setMsg(null);
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.display_order), -1);
    const { error } = await supabase.from("tool_categories").insert({
      name,
      display_order: maxOrder + 1,
    });
    if (error) {
      setMsg({ type: "err", text: error.message });
    } else {
      setNewCatName("");
      await load();
      setMsg({ type: "ok", text: `Category "${name}" created.` });
    }
  }

  async function renameCategory(catId: string, newName: string) {
    if (!newName.trim()) return;
    setMsg(null);
    const { error } = await supabase
      .from("tool_categories")
      .update({ name: newName.trim() })
      .eq("id", catId);
    if (error) {
      setMsg({ type: "err", text: error.message });
    } else {
      await load();
      setMsg({ type: "ok", text: "Category renamed." });
    }
  }

  async function removeCategory(catId: string) {
    if (!window.confirm("Delete this category? Tools inside it will not be deleted, only ungrouped."))
      return;
    setMsg(null);
    const { error } = await supabase.from("tool_categories").delete().eq("id", catId);
    if (error) {
      setMsg({ type: "err", text: error.message });
    } else {
      await load();
      setMsg({ type: "ok", text: "Category removed." });
    }
  }

  async function toggleTool(catId: string, toolId: string, currentlyIn: boolean) {
    setMsg(null);
    if (currentlyIn) {
      const { error } = await supabase
        .from("tool_category_items")
        .delete()
        .eq("category_id", catId)
        .eq("tool_id", toolId);
      if (error) setMsg({ type: "err", text: error.message });
    } else {
      const cat = categories.find((c) => c.id === catId);
      const maxOrder = cat ? cat.items.reduce((m, i) => Math.max(m, i.display_order), -1) : -1;
      const { error } = await supabase.from("tool_category_items").insert({
        category_id: catId,
        tool_id: toolId,
        display_order: maxOrder + 1,
      });
      if (error) setMsg({ type: "err", text: error.message });
    }
    await load();
  }

  async function moveToolUp(catId: string, itemId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const idx = cat.items.findIndex((i) => i.id === itemId);
    if (idx <= 0) return;
    const items = [...cat.items];
    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, items } : c))
    );
    // Persist reorder
    for (let i = 0; i < items.length; i++) {
      await supabase
        .from("tool_category_items")
        .update({ display_order: i })
        .eq("id", items[i].id);
    }
  }

  async function moveToolDown(catId: string, itemId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const idx = cat.items.findIndex((i) => i.id === itemId);
    if (idx < 0 || idx >= cat.items.length - 1) return;
    const items = [...cat.items];
    [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, items } : c))
    );
    for (let i = 0; i < items.length; i++) {
      await supabase
        .from("tool_category_items")
        .update({ display_order: i })
        .eq("id", items[i].id);
    }
  }

  if (loading) {
    return <p className="admin-help">Loading categories…</p>;
  }

  return (
    <div className="admin-card admin-card-pad" style={{ maxWidth: 900 }}>
      {msg ? (
        <p
          className={`admin-msg ${msg.type === "ok" ? "admin-msg--ok" : "admin-msg--err"}`}
          style={{ marginBottom: 16 }}
        >
          {msg.text}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "flex-end" }}>
        <label className="admin-label" style={{ flex: 1, marginBottom: 0 }}>
          New category name
          <input
            className="admin-input"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Writing & Communication"
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
        </label>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={() => void addCategory()}
          disabled={!newCatName.trim()}
          style={{ height: 42 }}
        >
          + Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="admin-help">
          No categories yet. Create one above, then assign tools to it.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {categories.map((cat) => {
            const assignedIds = new Set(cat.items.map((i) => i.tool_id));
            return (
              <div
                key={cat.id}
                style={{
                  border: "1px solid #e0ddd6",
                  borderRadius: 8,
                  padding: 16,
                  background: "#faf9f6",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <input
                    className="admin-input"
                    style={{ flex: 1, fontWeight: 600, fontSize: "1rem" }}
                    defaultValue={cat.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value.trim() !== cat.name) {
                        void renameCategory(cat.id, e.target.value.trim());
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    style={{ color: "#b91c1c", fontSize: "0.8rem" }}
                    onClick={() => void removeCategory(cat.id)}
                  >
                    Delete
                  </button>
                </div>

                <div>
                  <p style={{ fontSize: "0.78rem", fontWeight: 600, margin: "0 0 6px", color: "#555" }}>
                    Assigned tools (click to toggle):
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ALL_TOOLS.map((t) => {
                      const inCat = assignedIds.has(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => void toggleTool(cat.id, t.id, inCat)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: `1px solid ${inCat ? "#1a4a7a" : "#ccc"}`,
                            background: inCat ? "#1a4a7a" : "transparent",
                            color: inCat ? "#fff" : "#333",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            fontFamily: "inherit",
                          }}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {cat.items.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: "0.78rem", fontWeight: 600, margin: "0 0 4px", color: "#555" }}>
                      Order (use arrows to reorder):
                    </p>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                      {cat.items.map((item, idx) => {
                        const tool = ALL_TOOLS.find((t) => t.id === item.tool_id);
                        return (
                          <li
                            key={item.id}
                            style={{
                              marginBottom: 2,
                              fontSize: "0.85rem",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span>{tool?.name || item.tool_id}</span>
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost"
                              style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                              disabled={idx === 0}
                              onClick={() => void moveToolUp(cat.id, item.id)}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost"
                              style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                              disabled={idx === cat.items.length - 1}
                              onClick={() => void moveToolDown(cat.id, item.id)}
                            >
                              ▼
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
