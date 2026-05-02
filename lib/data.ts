import type { Employee, EmployeeStat } from "@/types/employee";
import type { PageContentMap } from "@/types/content";
import {
  DEFAULT_EMPLOYEES,
  DEFAULT_PAGE_CONTENT,
  DEFAULT_PARTNERS,
  EMPLOYEE_STATS_BY_NAME,
  type PartnerRow,
} from "./constants";
import { createClient } from "./supabase/server";

function parseEmployeeStats(raw: unknown): EmployeeStat[] | null {
  if (!Array.isArray(raw)) return null;
  const out: EmployeeStat[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "value" in item &&
      "label" in item &&
      typeof (item as EmployeeStat).value === "string" &&
      typeof (item as EmployeeStat).label === "string"
    ) {
      out.push({
        value: (item as EmployeeStat).value,
        label: (item as EmployeeStat).label,
      });
    }
  }
  return out.length ? out : null;
}

function mergeEmployeeStats(e: Employee): Employee {
  const fromDb = parseEmployeeStats(e.stats);
  if (fromDb?.length) return { ...e, stats: fromDb };
  const fallback = EMPLOYEE_STATS_BY_NAME[e.name];
  return { ...e, stats: fallback ?? [] };
}

/** DB rows may carry legacy display names; public copy stays aligned with DEFAULT_EMPLOYEES for known ids */
function withCanonicalTeamIdentity(e: Employee): Employee {
  const def = DEFAULT_EMPLOYEES.find((d) => d.id === e.id);
  if (!def) return e;
  return {
    ...e,
    name: def.name,
    role: def.role,
    role_badge: def.role_badge,
  };
}

function hasSupabaseEnv() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// normalizePageContent removed — Supabase page_content rows are backups.
// getPageContent() returns DEFAULT_PAGE_CONTENT directly.

export async function getEmployees(): Promise<Employee[]> {
  if (!hasSupabaseEnv()) return DEFAULT_EMPLOYEES;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (error || !data?.length) return DEFAULT_EMPLOYEES;
    return (data as Employee[]).map((e) =>
      mergeEmployeeStats(
        withCanonicalTeamIdentity({
          ...e,
          avatar_url: e.avatar_url ?? null,
        }),
      ),
    );
  } catch {
    return DEFAULT_EMPLOYEES;
  }
}

export async function getPartners(): Promise<PartnerRow[]> {
  if (!hasSupabaseEnv()) return DEFAULT_PARTNERS;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (error || !data?.length) return DEFAULT_PARTNERS;
    return data as PartnerRow[];
  } catch {
    return DEFAULT_PARTNERS;
  }
}

export async function getPageContent(): Promise<PageContentMap> {
  // Always return the latest defaults (constants.ts).
  // Admin /content editor saves to Supabase page_content table, but those rows
  // are treated as a read-only backup — the code defaults are the source of truth.
  return DEFAULT_PAGE_CONTENT;
}
