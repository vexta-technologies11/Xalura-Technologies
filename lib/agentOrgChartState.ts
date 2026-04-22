export type OrgPerson = {
  id: string;
  name: string;
  title: string;
  /** data URL — kept in localStorage only (browser). */
  photoDataUrl?: string;
};

export type AgentOrgChartPersisted = {
  chief: OrgPerson;
  executives: OrgPerson[];
  managers: OrgPerson[];
  workers: OrgPerson[];
};

const STORAGE_KEY = "xalura:ai-org-chart:v1";

export const defaultOrgChart = (): AgentOrgChartPersisted => ({
  chief: {
    id: "chief-ai",
    name: "Chief AI",
    title: "Executive oversight",
  },
  executives: [
    { id: "exec-coo", name: "COO", title: "Chief Operating Officer" },
    { id: "exec-cio", name: "CIO", title: "Chief Information Officer" },
    { id: "exec-cto", name: "CTO", title: "Chief Technology Officer" },
  ],
  managers: [
    { id: "dir-1", name: "Director", title: "Operations" },
    { id: "dir-2", name: "Director", title: "Engineering" },
    { id: "dir-3", name: "Director", title: "Product" },
    { id: "dir-4", name: "Director", title: "Growth" },
  ],
  workers: [],
});

export function loadOrgChart(): AgentOrgChartPersisted {
  if (typeof window === "undefined") return defaultOrgChart();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultOrgChart();
    const parsed = JSON.parse(raw) as AgentOrgChartPersisted;
    if (!parsed?.chief || !Array.isArray(parsed.executives)) {
      return defaultOrgChart();
    }
    return {
      chief: parsed.chief,
      executives: parsed.executives.slice(0, 6),
      managers: Array.isArray(parsed.managers) ? parsed.managers : [],
      workers: Array.isArray(parsed.workers) ? parsed.workers : [],
    };
  } catch {
    return defaultOrgChart();
  }
}

export function saveOrgChart(state: AgentOrgChartPersisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — skip */
  }
}

/** Ensure every Supabase employee appears in workers if not already in any tier. */
export function mergeEmployeesIntoWorkers(
  state: AgentOrgChartPersisted,
  employees: { id: string; name: string }[],
): AgentOrgChartPersisted {
  const allIds = new Set<string>([
    state.chief.id,
    ...state.executives.map((p) => p.id),
    ...state.managers.map((p) => p.id),
    ...state.workers.map((p) => p.id),
  ]);
  const extra: OrgPerson[] = [];
  for (const e of employees) {
    if (!allIds.has(e.id)) {
      extra.push({
        id: e.id,
        name: e.name,
        title: "AI Agent",
      });
      allIds.add(e.id);
    }
  }
  if (extra.length === 0) return state;
  return { ...state, workers: [...state.workers, ...extra] };
}
