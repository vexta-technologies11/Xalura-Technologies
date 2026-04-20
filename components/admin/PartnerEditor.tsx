"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Partner = {
  id: string;
  name: string;
  logo_url: string | null;
  display_order: number;
  is_active: boolean;
};

export function PartnerEditor({ initial }: { initial: Partner[] }) {
  const [rows, setRows] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.display_order - b.display_order),
    [rows],
  );

  async function save(p: Partner) {
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("partners")
      .update({
        name: p.name,
        logo_url: p.logo_url,
        display_order: p.display_order,
        is_active: p.is_active,
      })
      .eq("id", p.id);
    if (error) setMsg(error.message);
    else setMsg("Saved.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sorted.map((p) => (
        <div
          key={p.id}
          className="admin-card admin-card-pad admin-partner-grid"
        >
          <label className="admin-label">
            Name
            <input
              className="admin-input"
              value={p.name}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)),
                )
              }
            />
          </label>
          <label className="admin-label">
            Logo path
            <input
              className="admin-input"
              value={p.logo_url ?? ""}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) =>
                    x.id === p.id ? { ...x, logo_url: e.target.value || null } : x,
                  ),
                )
              }
            />
          </label>
          <label className="admin-label">
            Order
            <input
              type="number"
              className="admin-input"
              value={p.display_order}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) =>
                    x.id === p.id ? { ...x, display_order: Number(e.target.value) } : x,
                  ),
                )
              }
            />
          </label>
          <label
            className="admin-label"
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <input
              type="checkbox"
              checked={p.is_active}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) =>
                    x.id === p.id ? { ...x, is_active: e.target.checked } : x,
                  ),
                )
              }
            />
            Active
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => void save(rows.find((x) => x.id === p.id)!)}
            >
              Save {p.name}
            </button>
          </div>
        </div>
      ))}
      {msg ? <p className="admin-msg admin-msg--ok">{msg}</p> : null}
    </div>
  );
}
