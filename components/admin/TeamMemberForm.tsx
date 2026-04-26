"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPLOYEE_AVATAR_BUCKET,
  extensionForFile,
  validateAvatarFile,
} from "@/lib/employeeAvatarUpload";
import type { TeamMemberRow } from "@/types/team";

type Row = {
  id?: string;
  name: string;
  title: string;
  department: string;
  region_badge: string;
  avatar_url: string;
  display_order: number;
  is_active: boolean;
};

const defaultRow: Row = {
  name: "",
  title: "",
  department: "leadership",
  region_badge: "",
  avatar_url: "",
  display_order: 0,
  is_active: true,
};

const DEPT_PLACEHOLDER = "Optional tag for your records (not shown as a filter on the public team page).";

export function TeamMemberForm({ initial }: { initial?: TeamMemberRow | null }) {
  const router = useRouter();
  const draftFolder = useRef(crypto.randomUUID());
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [row, setRow] = useState<Row>(() => {
    if (!initial) return defaultRow;
    return {
      id: initial.id,
      name: initial.name,
      title: initial.title,
      department: (initial.department as string) || "leadership",
      region_badge: initial.region_badge ?? "",
      avatar_url: initial.avatar_url ?? "",
      display_order: initial.display_order ?? 0,
      is_active: initial.is_active,
    };
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function handlePhotoPick(file: File | null) {
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
      const folder = `team/${row.id ?? `draft-${draftFolder.current}`}`;
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
          ? err.message
          : "Upload failed. Ensure the employee-avatars bucket exists (see supabase/schema.sql).",
      );
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!row.name.trim()) {
      setMsg("Name is required.");
      return;
    }
    const supabase = createClient();
    const payload = {
      name: row.name.trim(),
      title: row.title.trim(),
      department: row.department.trim() || "leadership",
      region_badge: row.region_badge.trim() || null,
      avatar_url: row.avatar_url.trim() || null,
      display_order: row.display_order,
      is_active: row.is_active,
    };
    if (row.id) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", row.id);
      if (error) {
        setMsg(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("team_members").insert(payload);
      if (error) {
        setMsg(error.message);
        return;
      }
    }
    router.push("/admin/team-members");
    router.refresh();
  }

  async function onDelete() {
    if (!row.id || !window.confirm("Remove this person from the public team page?")) return;
    setDeleting(true);
    setMsg(null);
    const { error } = await createClient().from("team_members").delete().eq("id", row.id);
    setDeleting(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.push("/admin/team-members");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="admin-card admin-card-pad"
      style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}
    >
      {msg ? <p className="admin-msg admin-msg--err">{msg}</p> : null}
      <label className="admin-label">
        Name
        <input
          className="admin-input"
          value={row.name}
          onChange={(e) => setRow({ ...row, name: e.target.value })}
          required
        />
      </label>
      <label className="admin-label">
        Title (e.g. Head of Sales)
        <input
          className="admin-input"
          value={row.title}
          onChange={(e) => setRow({ ...row, title: e.target.value })}
        />
      </label>
      <label className="admin-label">
        Department (optional)
        <input
          className="admin-input"
          value={row.department}
          onChange={(e) => setRow({ ...row, department: e.target.value.replace(/\s+/g, "_") })}
        />
        <span className="admin-help" style={{ marginTop: 4 }}>{DEPT_PLACEHOLDER}</span>
      </label>
      <label className="admin-label">
        Region badge (optional, 1–3 characters)
        <input
          className="admin-input"
          value={row.region_badge}
          onChange={(e) => setRow({ ...row, region_badge: e.target.value.slice(0, 3) })}
          maxLength={3}
        />
      </label>
      <label className="admin-label">
        Display order (lower = first)
        <input
          className="admin-input"
          type="number"
          value={row.display_order}
          onChange={(e) => setRow({ ...row, display_order: Number(e.target.value) || 0 })}
        />
      </label>
      <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={row.is_active}
          onChange={(e) => setRow({ ...row, is_active: e.target.checked })}
        />
        <span>Visible on site</span>
      </label>
      <div className="admin-label">
        Photo (JPG, PNG, WebP — up to 8 MB)
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
          className="admin-input"
          style={{ padding: 10 }}
          disabled={uploading}
          onChange={(e) => void handlePhotoPick(e.target.files?.[0] ?? null)}
        />
        {row.avatar_url ? (
          <a href={row.avatar_url} className="admin-help" target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 4 }}>
            Current: open image
          </a>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={uploading || deleting}>
          {row.id ? "Save" : "Add to team page"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => router.push("/admin/team-members")}
        >
          Back
        </button>
        {row.id ? (
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            style={{ color: "#b91c1c" }}
            onClick={() => void onDelete()}
            disabled={deleting}
          >
            {deleting ? "Removing…" : "Remove from team page"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
