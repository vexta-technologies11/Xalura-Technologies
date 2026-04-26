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

/** Merge DB JSON over defaults so partial/wrong shapes never break the page */
function normalizePageContent(raw: PageContentMap): PageContentMap {
  const d = DEFAULT_PAGE_CONTENT;
  return {
    hero: {
      ...d.hero,
      ...raw.hero,
      headline: raw.hero?.headline ?? d.hero.headline,
      subhead: raw.hero?.subhead ?? d.hero.subhead,
      label: raw.hero?.label ?? d.hero.label,
      primaryCta: raw.hero?.primaryCta ?? d.hero.primaryCta,
      secondaryCta: raw.hero?.secondaryCta ?? d.hero.secondaryCta,
      bentoHint: raw.hero?.bentoHint ?? d.hero.bentoHint,
    },
    mission: {
      ...d.mission,
      ...raw.mission,
      headline: raw.mission?.headline ?? d.mission.headline,
      body: raw.mission?.body ?? d.mission.body,
      label: raw.mission?.label ?? d.mission.label,
    },
    brand: {
      ...d.brand,
      ...raw.brand,
      offerLabel: raw.brand?.offerLabel ?? d.brand.offerLabel,
      offerBlockHeadline: raw.brand?.offerBlockHeadline ?? d.brand.offerBlockHeadline,
      offerNews: raw.brand?.offerNews ?? d.brand.offerNews,
      offerArticles: raw.brand?.offerArticles ?? d.brand.offerArticles,
      offerCourses: raw.brand?.offerCourses ?? d.brand.offerCourses,
      howLabel: raw.brand?.howLabel ?? d.brand.howLabel,
      howBody: raw.brand?.howBody ?? d.brand.howBody,
      whoLabel: raw.brand?.whoLabel ?? d.brand.whoLabel,
      whoBody: raw.brand?.whoBody ?? d.brand.whoBody,
      apartLabel: raw.brand?.apartLabel ?? d.brand.apartLabel,
      apartBody: raw.brand?.apartBody ?? d.brand.apartBody,
      approachLabel: raw.brand?.approachLabel ?? d.brand.approachLabel,
      approachBody: raw.brand?.approachBody ?? d.brand.approachBody,
    },
    gearmedic: {
      ...d.gearmedic,
      ...raw.gearmedic,
      headline: raw.gearmedic?.headline ?? d.gearmedic.headline,
      body: raw.gearmedic?.body ?? d.gearmedic.body,
      body2: raw.gearmedic?.body2 ?? d.gearmedic.body2,
      label: raw.gearmedic?.label ?? d.gearmedic.label,
      cta: raw.gearmedic?.cta ?? d.gearmedic.cta,
      features: Array.isArray(raw.gearmedic?.features)
        ? raw.gearmedic!.features!
        : d.gearmedic.features,
      metrics: Array.isArray(raw.gearmedic?.metrics)
        ? (raw.gearmedic!.metrics as PageContentMap["gearmedic"]["metrics"])
        : d.gearmedic.metrics,
    },
    founder: {
      ...d.founder,
      ...raw.founder,
      name: raw.founder?.name ?? d.founder.name,
      postnominal: raw.founder?.postnominal ?? d.founder.postnominal,
      quote: raw.founder?.quote ?? d.founder.quote,
      bio: raw.founder?.bio ?? d.founder.bio,
      bio2: raw.founder?.bio2 ?? d.founder.bio2,
      label: raw.founder?.label ?? d.founder.label,
      role: raw.founder?.role ?? d.founder.role,
    },
    closing: {
      ...d.closing,
      ...raw.closing,
      headline: raw.closing?.headline ?? d.closing.headline,
      body: raw.closing?.body ?? d.closing.body,
      label: raw.closing?.label ?? d.closing.label,
      cta: raw.closing?.cta ?? d.closing.cta,
    },
    footer: {
      ...d.footer,
      ...raw.footer,
      tagline: raw.footer?.tagline ?? d.footer.tagline,
    },
  };
}

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
  const base = DEFAULT_PAGE_CONTENT;
  if (!hasSupabaseEnv()) return base;
  try {
    const supabase = createClient();
    const { data } = await supabase.from("page_content").select("section, content");
    if (!data?.length) return base;
    const merged = JSON.parse(JSON.stringify(base)) as Record<
      keyof PageContentMap,
      Record<string, unknown>
    >;
    for (const row of data as {
      section: keyof PageContentMap;
      content: Record<string, unknown>;
    }[]) {
      if (row.section && merged[row.section] && row.content) {
        merged[row.section] = {
          ...merged[row.section],
          ...row.content,
        };
      }
    }
    return normalizePageContent(merged as unknown as PageContentMap);
  } catch {
    return base;
  }
}
