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
    [rows]
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
          style={{
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 10,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <label style={lbl}>
            Name
            <input
              style={inp}
              value={p.name}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x))
                )
              }
            />
          </label>
          <label style={lbl}>
            Logo path
            <input
              style={inp}
              value={p.logo_url ?? ""}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) =>
                    x.id === p.id ? { ...x, logo_url: e.target.value || null } : x
                  )
                )
              }
            />
          </label>
          <label style={lbl}>
            Order
            <input
              type="number"
              style={inp}
              value={p.display_order}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) =>
                    x.id === p.id ? { ...x, display_order: Number(e.target.value) } : x
                  )
                )
              }
            />
          </label>
          <label style={{ ...lbl, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={p.is_active}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) =>
                    x.id === p.id ? { ...x, is_active: e.target.checked } : x
                  )
                )
              }
            />
            Active
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              onClick={() => void save(rows.find((x) => x.id === p.id)!)}
              style={{
                background: "#0a0a0a",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: 100,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Save {p.name}
            </button>
          </div>
        </div>
      ))}
      {msg ? <p style={{ fontSize: 13 }}>{msg}</p> : null}
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
};

const inp: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e5e5e5",
  fontSize: 14,
};
