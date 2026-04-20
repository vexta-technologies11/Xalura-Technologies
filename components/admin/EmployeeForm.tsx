"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { IconType } from "@/types/employee";

type Row = {
  id?: string;
  name: string;
  role: string;
  role_badge: string;
  description: string;
  icon_type: IconType;
  avatar_url: string;
  display_order: number;
  is_active: boolean;
};

function statsJsonFromInitial(initial?: Record<string, unknown>) {
  if (!initial) return "[]";
  const s = initial.stats;
  if (Array.isArray(s) && s.length) return JSON.stringify(s, null, 2);
  return "[]";
}

const defaultRow: Row = {
  name: "",
  role: "",
  role_badge: "",
  description: "",
  icon_type: "writer",
  avatar_url: "",
  display_order: 0,
  is_active: true,
};

export function EmployeeForm({ initial }: { initial?: Record<string, unknown> }) {
  const router = useRouter();
  const [row, setRow] = useState<Row>(() => {
    if (!initial) return defaultRow;
    return {
      id: initial.id as string,
      name: (initial.name as string) ?? "",
      role: (initial.role as string) ?? "",
      role_badge: (initial.role_badge as string) ?? "",
      description: (initial.description as string) ?? "",
      icon_type: (initial.icon_type as IconType) ?? "writer",
      avatar_url: (initial.avatar_url as string) ?? "",
      display_order: Number(initial.display_order) || 0,
      is_active: Boolean(initial.is_active),
    };
  });
  const [statsJson, setStatsJson] = useState(() => statsJsonFromInitial(initial));
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    let statsPayload: unknown;
    try {
      statsPayload = JSON.parse(statsJson.trim() || "[]");
    } catch {
      setMsg("Stats must be valid JSON (array of { value, label }).");
      return;
    }
    if (!Array.isArray(statsPayload)) {
      setMsg("Stats must be a JSON array.");
      return;
    }
    const statsClean = statsPayload.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as { value?: unknown }).value === "string" &&
        typeof (item as { label?: unknown }).label === "string",
    );
    const supabase = createClient();
    if (row.id) {
      const { error } = await supabase
        .from("employees")
        .update({
          name: row.name,
          role: row.role,
          role_badge: row.role_badge,
          description: row.description,
          icon_type: row.icon_type,
          avatar_url: row.avatar_url.trim() || null,
          stats: statsClean,
          display_order: row.display_order,
          is_active: row.is_active,
        })
        .eq("id", row.id);
      if (error) {
        setMsg(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("employees").insert({
        name: row.name,
        role: row.role,
        role_badge: row.role_badge,
        description: row.description,
        icon_type: row.icon_type,
        avatar_url: row.avatar_url.trim() || null,
        stats: statsClean,
        display_order: row.display_order,
        is_active: row.is_active,
      });
      if (error) {
        setMsg(error.message);
        return;
      }
    }
    router.push("/admin/employees");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "#fff",
        padding: 24,
        borderRadius: 12,
        border: "1px solid #e5e5e5",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Name
        <input
          required
          value={row.name}
          onChange={(e) => setRow({ ...row, name: e.target.value })}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Role
        <input
          required
          value={row.role}
          onChange={(e) => setRow({ ...row, role: e.target.value })}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Role badge
        <input
          required
          value={row.role_badge}
          onChange={(e) => setRow({ ...row, role_badge: e.target.value })}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Avatar URL
        <input
          type="url"
          placeholder="/avatars/mochi.png or https://…"
          value={row.avatar_url}
          onChange={(e) => setRow({ ...row, avatar_url: e.target.value })}
          style={inputStyle}
        />
        <span style={{ fontSize: 11, color: "#737373", fontWeight: 400 }}>
          Path under <code>public/</code> or full image URL. Replace example files in{" "}
          <code>public/avatars/</code> anytime.
        </span>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Stats (JSON)
        <textarea
          rows={6}
          value={statsJson}
          onChange={(e) => setStatsJson(e.target.value)}
          placeholder={`[\n  { "value": "6", "label": "Research drafts in your queue" }\n]`}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 12 }}
        />
        <span style={{ fontSize: 11, color: "#737373", fontWeight: 400 }}>
          <code>value</code> = bold figure (e.g. <code>70+</code>), <code>label</code> = the rest of the line.
          Leave <code>[]</code> for built-in defaults by name.
        </span>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Description
        <textarea
          required
          rows={5}
          value={row.description}
          onChange={(e) => setRow({ ...row, description: e.target.value })}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Icon type
        <select
          value={row.icon_type}
          onChange={(e) =>
            setRow({ ...row, icon_type: e.target.value as IconType })
          }
          style={inputStyle}
        >
          <option value="writer">writer</option>
          <option value="seo">seo</option>
          <option value="analyst">analyst</option>
          <option value="designer">designer</option>
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Display order
        <input
          type="number"
          value={row.display_order}
          onChange={(e) =>
            setRow({ ...row, display_order: Number(e.target.value) })
          }
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={row.is_active}
          onChange={(e) => setRow({ ...row, is_active: e.target.checked })}
        />
        Active
      </label>
      {msg ? <p style={{ color: "#b91c1c", fontSize: 13 }}>{msg}</p> : null}
      <button
        type="submit"
        style={{
          background: "#0a0a0a",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: 100,
          border: "none",
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        Save
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e5e5e5",
  fontSize: 14,
};
