"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPLOYEE_AVATAR_BUCKET,
  extensionForFile,
  validateAvatarFile,
} from "@/lib/employeeAvatarUpload";
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

/** PostgREST PGRST204 / stale cache — missing column in API layer */
function isPostgrestSchemaOrMissingColumn(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("pgrst204") ||
    m.includes("pgrst205") ||
    (m.includes("could not find") && m.includes("column"))
  );
}

const SUPABASE_EMPLOYEES_FIX_SQL = `alter table employees add column if not exists avatar_url text;
alter table employees add column if not exists stats jsonb default '[]'::jsonb;
notify pgrst, 'reload schema';`;

const EMPLOYEE_FORM_NOTICE_KEY = "xalura_employee_form_notice";

/** PostgREST PGRST204 / stale cache — not a bad avatar string */
function formatSupabaseEmployeeError(message: string): string {
  if (isPostgrestSchemaOrMissingColumn(message)) {
    return `${message}\n\nRun in Supabase → SQL Editor:\n\n${SUPABASE_EMPLOYEES_FIX_SQL}`;
  }
  return message;
}

export function EmployeeForm({ initial }: { initial?: Record<string, unknown> }) {
  const router = useRouter();
  const draftFolder = useRef(crypto.randomUUID());
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    const pending = sessionStorage.getItem(EMPLOYEE_FORM_NOTICE_KEY);
    if (pending) {
      setMsg(pending);
      sessionStorage.removeItem(EMPLOYEE_FORM_NOTICE_KEY);
    }
  }, []);

  async function handleAvatarPick(file: File | null) {
    if (!file) return;
    const v = validateAvatarFile(file);
    if (v) {
      setMsg(v);
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const ext = extensionForFile(file);
      const folder = row.id ?? `draft-${draftFolder.current}`;
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(EMPLOYEE_AVATAR_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(EMPLOYEE_AVATAR_BUCKET).getPublicUrl(path);
      setRow((r) => ({ ...r, avatar_url: data.publicUrl }));
    } catch (err: unknown) {
      setMsg(
        err instanceof Error
          ? `${err.message}\n\nIf uploads fail, create the "${EMPLOYEE_AVATAR_BUCKET}" storage bucket in Supabase (see supabase/schema.sql).`
          : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    let statsPayload: unknown;
    if (!statsJson.trim()) {
      statsPayload = [];
    } else {
      try {
        statsPayload = JSON.parse(statsJson);
      } catch {
        setMsg("Stats must be valid JSON (array of { value, label }), or leave empty for [].");
        return;
      }
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
    const coreFields = {
      name: row.name,
      role: row.role,
      role_badge: row.role_badge,
      description: row.description,
      icon_type: row.icon_type,
      display_order: row.display_order,
      is_active: row.is_active,
    };
    if (row.id) {
      const fullUpdate = {
        ...coreFields,
        avatar_url: row.avatar_url.trim() || null,
        stats: statsClean,
      };
      let { error } = await supabase.from("employees").update(fullUpdate).eq("id", row.id);
      if (error && isPostgrestSchemaOrMissingColumn(error.message)) {
        const { error: retryErr } = await supabase
          .from("employees")
          .update(coreFields)
          .eq("id", row.id);
        if (!retryErr) {
          setMsg(
            `Saved name, role, and description. Avatar and stats were skipped because the database API does not see those columns yet.\n\nRun in Supabase → SQL Editor, then click Save again:\n\n${SUPABASE_EMPLOYEES_FIX_SQL}`,
          );
          router.refresh();
          return;
        }
        error = retryErr;
      }
      if (error) {
        setMsg(formatSupabaseEmployeeError(error.message));
        return;
      }
    } else {
      const insertRow = {
        ...coreFields,
        avatar_url: row.avatar_url.trim() || null,
        stats: statsClean,
      };
      let { error } = await supabase.from("employees").insert(insertRow);
      if (error && isPostgrestSchemaOrMissingColumn(error.message)) {
        const { data: created, error: retryErr } = await supabase
          .from("employees")
          .insert(coreFields)
          .select("id")
          .single();
        if (!retryErr && created?.id) {
          sessionStorage.setItem(
            EMPLOYEE_FORM_NOTICE_KEY,
            `Employee created without avatar and stats. Add columns in Supabase, then save again.\n\n${SUPABASE_EMPLOYEES_FIX_SQL}`,
          );
          router.replace(`/admin/employees/${created.id}`);
          router.refresh();
          return;
        }
        error = retryErr ?? error;
      }
      if (error) {
        setMsg(formatSupabaseEmployeeError(error.message));
        return;
      }
    }
    router.push("/admin/employees");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="admin-card admin-card-pad"
      style={{
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <label className="admin-label">
        Name
        <input
          className="admin-input"
          value={row.name}
          onChange={(e) => setRow({ ...row, name: e.target.value })}
        />
      </label>
      <label className="admin-label">
        Role
        <input
          className="admin-input"
          value={row.role}
          onChange={(e) => setRow({ ...row, role: e.target.value })}
        />
      </label>
      <label className="admin-label">
        Role badge
        <input
          className="admin-input"
          value={row.role_badge}
          onChange={(e) => setRow({ ...row, role_badge: e.target.value })}
        />
      </label>
      <div className="admin-label">
        Photo
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
          className="admin-input"
          style={{ padding: 10 }}
          disabled={uploading}
          onChange={(e) => void handleAvatarPick(e.target.files?.[0] ?? null)}
        />
        <span className="admin-help">
          Upload from your phone (JPEG, PNG, WebP, HEIC). Stored in Supabase Storage bucket{" "}
          <code>{EMPLOYEE_AVATAR_BUCKET}</code>. You can still paste a URL below instead.
        </span>
      </div>
      <label className="admin-label">
        Avatar URL (optional override)
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="/avatars/mochi.png or https://…"
          value={row.avatar_url}
          onChange={(e) => setRow({ ...row, avatar_url: e.target.value })}
          className="admin-input"
        />
        <span className="admin-help">
          Filled automatically after upload, or set manually. Leave empty for initials on the site.
        </span>
      </label>
      <label className="admin-label">
        Stats (JSON)
        <textarea
          rows={6}
          value={statsJson}
          onChange={(e) => setStatsJson(e.target.value)}
          placeholder={`[\n  { "value": "6", "label": "Research drafts in your queue" }\n]`}
          className="admin-textarea"
          style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
        />
        <span className="admin-help">
          <code>value</code> = bold figure (e.g. <code>70+</code>), <code>label</code> = the rest of the line.
          Leave empty for <code>[]</code> (defaults by name on the site).
        </span>
      </label>
      <label className="admin-label">
        Description
        <textarea
          rows={5}
          value={row.description}
          onChange={(e) => setRow({ ...row, description: e.target.value })}
          className="admin-textarea"
        />
      </label>
      <label className="admin-label">
        Icon type
        <select
          value={row.icon_type}
          onChange={(e) =>
            setRow({ ...row, icon_type: e.target.value as IconType })
          }
          className="admin-select"
        >
          <option value="writer">writer</option>
          <option value="seo">seo</option>
          <option value="analyst">analyst</option>
          <option value="designer">designer</option>
        </select>
      </label>
      <label className="admin-label">
        Display order
        <input
          type="number"
          value={row.display_order}
          onChange={(e) =>
            setRow({ ...row, display_order: Number(e.target.value) })
          }
          className="admin-input"
        />
      </label>
      <label className="admin-label" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          checked={row.is_active}
          onChange={(e) => setRow({ ...row, is_active: e.target.checked })}
        />
        Active
      </label>
      {msg ? (
        <p
          className={`admin-msg ${
            msg.startsWith("Saved ") || msg.startsWith("Employee created") ? "admin-msg--warn" : "admin-msg--err"
          }`}
          style={{ whiteSpace: "pre-line" }}
        >
          {msg}
        </p>
      ) : null}
      <button type="submit" className="admin-btn admin-btn--primary" style={{ alignSelf: "flex-start" }}>
        Save
      </button>
    </form>
  );
}
