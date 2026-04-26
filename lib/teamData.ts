import { createClient } from "@/lib/supabase/server";
import type { TeamMemberRow } from "@/types/team";

function hasSupabaseEnv() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Public team members for /team and the footer strip (no fallback rows—empty if table missing or none active).
 */
export async function getTeamMembers(limit?: number): Promise<TeamMemberRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    let q = supabase
      .from("team_members")
      .select("id, name, title, department, region_badge, avatar_url, is_active, display_order, created_at")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (typeof limit === "number" && limit > 0) {
      q = q.limit(limit);
    }
    const { data, error } = await q;
    if (error) return [];
    return (data ?? []) as TeamMemberRow[];
  } catch {
    return [];
  }
}

export async function getAllTeamMembersForAdmin(): Promise<TeamMemberRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("team_members")
      .select("id, name, title, department, region_badge, avatar_url, is_active, display_order, created_at")
      .order("display_order", { ascending: true });
    if (error) return [];
    return (data ?? []) as TeamMemberRow[];
  } catch {
    return [];
  }
}
