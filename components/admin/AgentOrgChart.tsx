"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TrafficEvent } from "@/lib/agentUpdatesStore";
import {
  defaultOrgChart,
  loadOrgChart,
  mergeEmployeesIntoWorkers,
  type AgentOrgChartPersisted,
  type OrgPerson,
  saveOrgChart,
} from "@/lib/agentOrgChartState";
import type { AgentUpdateRow } from "@/types/agent-dashboard";
import "./agent-org-chart.css";

type EmployeeMini = { id: string; name: string };
type TierKey = "chief" | "executives" | "managers" | "workers";

type DragPayload = { tier: TierKey; index: number };

function newWorker(): OrgPerson {
  return {
    id: `worker-${crypto.randomUUID()}`,
    name: "New agent",
    title: "Worker",
  };
}

function extractPerson(
  state: AgentOrgChartPersisted,
  tier: TierKey,
  index: number,
): { next: AgentOrgChartPersisted; person: OrgPerson | null } {
  if (tier === "chief") {
    return { next: state, person: { ...state.chief } };
  }
  if (tier === "executives") {
    const person = state.executives[index];
    if (!person) return { next: state, person: null };
    const executives = state.executives.filter((_, i) => i !== index);
    while (executives.length < 3) {
      executives.push({
        id: `exec-slot-${Date.now()}-${executives.length}`,
        name: "",
        title: "",
      });
    }
    return {
      next: { ...state, executives: executives.slice(0, 3) },
      person,
    };
  }
  if (tier === "managers") {
    const person = state.managers[index];
    if (!person) return { next: state, person: null };
    return {
      next: {
        ...state,
        managers: state.managers.filter((_, i) => i !== index),
      },
      person,
    };
  }
  const person = state.workers[index];
  if (!person) return { next: state, person: null };
  return {
    next: {
      ...state,
      workers: state.workers.filter((_, i) => i !== index),
    },
    person,
  };
}

function insertPerson(
  state: AgentOrgChartPersisted,
  tier: TierKey,
  person: OrgPerson,
  swapChief?: OrgPerson,
): AgentOrgChartPersisted {
  if (tier === "chief") {
    const demoted = swapChief ?? state.chief;
    return {
      ...state,
      chief: { ...person, id: "chief-ai", title: person.title || "Chief AI" },
      workers: [...state.workers, { ...demoted, id: `demoted-${crypto.randomUUID().slice(0, 8)}` }],
    };
  }
  if (tier === "executives") {
    const executives = [...state.executives];
    const emptyIdx = executives.findIndex((e) => !e.name.trim());
    if (emptyIdx >= 0) executives[emptyIdx] = { ...person, id: person.id || `exec-${emptyIdx}` };
    else executives[Math.min(1, executives.length - 1)] = person;
    return { ...state, executives: executives.slice(0, 3) };
  }
  if (tier === "managers") {
    return { ...state, managers: [...state.managers, person] };
  }
  return { ...state, workers: [...state.workers, person] };
}

export function AgentOrgChart({
  employees,
  updates,
  traffic,
}: {
  employees: EmployeeMini[];
  updates: AgentUpdateRow[];
  traffic: TrafficEvent[];
}) {
  const [org, setOrg] = useState<AgentOrgChartPersisted>(defaultOrgChart);
  const [mounted, setMounted] = useState(false);
  const [dragOver, setDragOver] = useState<TierKey | null>(null);
  const [liveTier, setLiveTier] = useState<
    Record<string, "worker" | "manager" | "executive" | "chief">
  >({});
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setMounted(true);
    setOrg(mergeEmployeesIntoWorkers(loadOrgChart(), employees));
    // initial load only — do not reset chart on every refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setOrg((prev) => mergeEmployeesIntoWorkers(prev, employees));
  }, [employees, mounted]);

  useEffect(() => {
    if (!mounted) return;
    saveOrgChart(org);
  }, [org, mounted]);

  const resolveAgentKey = useCallback((u: AgentUpdateRow) => {
    if (u.employee_id) return u.employee_id;
    return `ext:${u.agent_external_id.trim().toLowerCase()}`;
  }, []);

  const matchNodeToUpdate = useCallback(
    (p: OrgPerson, u: AgentUpdateRow) => {
      if (u.employee_id && p.id === u.employee_id) return true;
      if (
        !u.employee_id &&
        p.name.trim().toLowerCase() === u.agent_external_id.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    },
    [],
  );

  const trafficTip = traffic[0];

  useEffect(() => {
    if (!trafficTip || !updates.length) return;
    const row = updates.find((u) => u.id === trafficTip.updateId);
    if (!row) return;
    const key = resolveAgentKey(row);

    const clearLater = (id: string, ms: number) => {
      const prev = timers.current.get(id);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        setLiveTier((m) => {
          const n = { ...m };
          delete n[id];
          return n;
        });
        timers.current.delete(id);
      }, ms);
      timers.current.set(id, t);
    };

    if (trafficTip.action === "ingest") {
      setLiveTier((m) => ({ ...m, [key]: "worker" }));
      clearLater(key, 4500);
    } else if (trafficTip.action === "approved") {
      setLiveTier((m) => ({ ...m, [key]: "manager" }));
      clearLater(key, 2000);
      const execKey = `${key}::exec`;
      const prevEx = timers.current.get(execKey);
      if (prevEx) clearTimeout(prevEx);
      const t2 = setTimeout(() => {
        setLiveTier((m) => ({ ...m, [key]: "executive" }));
        clearLater(key, 2000);
      }, 450);
      timers.current.set(execKey, t2);
    }

    const timerMap = timers.current;
    return () => {
      for (const t of Array.from(timerMap.values())) clearTimeout(t);
      timerMap.clear();
    };
    // trafficTip fields used instead of object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    trafficTip?.t,
    trafficTip?.updateId,
    trafficTip?.action,
    updates,
    resolveAgentKey,
  ]);

  const nodeLiveClass = useCallback(
    (p: OrgPerson) => {
      const tier =
        liveTier[p.id] ?? liveTier[`ext:${p.name.trim().toLowerCase()}`];
      if (!tier) return "";
      if (tier === "worker") return "agent-org-node--tier-worker";
      if (tier === "manager") return "agent-org-node--tier-manager";
      if (tier === "executive") return "agent-org-node--tier-manager";
      if (tier === "chief") return "agent-org-node--tier-chief";
      return "";
    },
    [liveTier],
  );

  const pulseIds = useMemo(() => {
    if (!trafficTip || !updates.length) return new Set<string>();
    const row = updates.find((u) => u.id === trafficTip.updateId);
    if (!row || trafficTip.action === "declined") return new Set<string>();
    const keys = new Set<string>();
    const collect = (list: OrgPerson[]) => {
      for (const p of list) {
        if (matchNodeToUpdate(p, row)) keys.add(p.id);
      }
    };
    if (matchNodeToUpdate(org.chief, row)) keys.add(org.chief.id);
    collect(org.executives);
    collect(org.managers);
    collect(org.workers);
    return keys;
  }, [trafficTip, updates, org, matchNodeToUpdate]);

  function onDragStart(e: React.DragEvent, tier: TierKey, index: number) {
    if (tier === "chief") {
      e.preventDefault();
      return;
    }
    const payload: DragPayload = { tier, index };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropTier(e: React.DragEvent, target: TierKey) {
    e.preventDefault();
    setDragOver(null);
    let raw: DragPayload;
    try {
      raw = JSON.parse(e.dataTransfer.getData("application/json")) as DragPayload;
    } catch {
      return;
    }
    if (raw.tier === target) return;

    setOrg((prev) => {
      const { next: afterRemove, person } = extractPerson(
        prev,
        raw.tier,
        raw.index,
      );
      if (!person || !person.name.trim()) return prev;
      if (raw.tier === target) return prev;
      if (target === "chief") {
        return insertPerson(afterRemove, "chief", person, afterRemove.chief);
      }
      if (raw.tier === "chief") return prev;
      return insertPerson(afterRemove, target, person);
    });
  }

  function updatePerson(
    tier: TierKey,
    index: number,
    patch: Partial<Pick<OrgPerson, "name" | "title">>,
  ) {
    setOrg((prev) => {
      if (tier === "chief") {
        return { ...prev, chief: { ...prev.chief, ...patch } };
      }
      if (tier === "executives") {
        const executives = [...prev.executives];
        executives[index] = { ...executives[index]!, ...patch };
        return { ...prev, executives };
      }
      if (tier === "managers") {
        const managers = [...prev.managers];
        managers[index] = { ...managers[index]!, ...patch };
        return { ...prev, managers };
      }
      const workers = [...prev.workers];
      workers[index] = { ...workers[index]!, ...patch };
      return { ...prev, workers };
    });
  }

  function removePerson(tier: TierKey, index: number) {
    if (tier === "chief") return;
    setOrg((prev) => {
      if (tier === "executives") {
        const executives = [...prev.executives];
        executives[index] = {
          id: executives[index]!.id,
          name: "",
          title: "",
          photoDataUrl: undefined,
        };
        return { ...prev, executives };
      }
      if (tier === "managers") {
        return {
          ...prev,
          managers: prev.managers.filter((_, i) => i !== index),
        };
      }
      return {
        ...prev,
        workers: prev.workers.filter((_, i) => i !== index),
      };
    });
  }

  function onPhoto(tier: TierKey, index: number, file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : undefined;
      if (!url) return;
      setOrg((prev) => {
        if (tier === "chief") {
          return { ...prev, chief: { ...prev.chief, photoDataUrl: url } };
        }
        if (tier === "executives") {
          const executives = [...prev.executives];
          const cur = executives[index]!;
          executives[index] = { ...cur, photoDataUrl: url };
          return { ...prev, executives };
        }
        if (tier === "managers") {
          const managers = [...prev.managers];
          const cur = managers[index]!;
          managers[index] = { ...cur, photoDataUrl: url };
          return { ...prev, managers };
        }
        const workers = [...prev.workers];
        const cur = workers[index]!;
        workers[index] = { ...cur, photoDataUrl: url };
        return { ...prev, workers };
      });
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto(tier: TierKey, index: number) {
    setOrg((prev) => {
      if (tier === "chief") {
        const c = { ...prev.chief };
        delete c.photoDataUrl;
        return { ...prev, chief: c };
      }
      if (tier === "executives") {
        const executives = [...prev.executives];
        const c = { ...executives[index]! };
        delete c.photoDataUrl;
        executives[index] = c;
        return { ...prev, executives };
      }
      if (tier === "managers") {
        const managers = [...prev.managers];
        const c = { ...managers[index]! };
        delete c.photoDataUrl;
        managers[index] = c;
        return { ...prev, managers };
      }
      const workers = [...prev.workers];
      const c = { ...workers[index]! };
      delete c.photoDataUrl;
      workers[index] = c;
      return { ...prev, workers };
    });
  }

  function renderNode(
    p: OrgPerson,
    tier: TierKey,
    index: number,
    opts: { draggable?: boolean; showRemove?: boolean },
  ) {
    const draggable =
      opts.draggable !== false &&
      tier !== "chief" &&
      !!p.name.trim();
    const live = nodeLiveClass(p);
    const pulse = pulseIds.has(p.id) ? " agent-org-node--pulse" : "";
    return (
      <div
        key={`${tier}-${p.id}-${index}`}
        className={`agent-org-node${live}${pulse}`}
        draggable={draggable}
        onDragStart={(e) => onDragStart(e, tier, index)}
      >
        <div className="agent-org-avatar-wrap">
          <div className="agent-org-avatar">
            {p.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photoDataUrl} alt={p.name || "Agent"} />
            ) : (
              <span aria-hidden>◆</span>
            )}
          </div>
        </div>
        <div className="agent-org-label">{p.name.trim() || "—"}</div>
        <div className="agent-org-title-field">{p.title.trim() || "—"}</div>
        <input
          type="text"
          className="agent-org-edit"
          placeholder="Name"
          value={p.name}
          onChange={(e) => updatePerson(tier, index, { name: e.target.value })}
          aria-label={`Name for ${p.title || "role"}`}
        />
        <input
          type="text"
          className="agent-org-edit"
          placeholder="Title"
          value={p.title}
          onChange={(e) => updatePerson(tier, index, { title: e.target.value })}
          aria-label={`Title for ${p.name || "agent"}`}
        />
        <div className="agent-org-node-actions">
          <label className="agent-org-mini">
            Photo
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) =>
                onPhoto(tier, index, e.target.files?.[0] ?? null)
              }
            />
          </label>
          {p.photoDataUrl ? (
            <button
              type="button"
              className="agent-org-mini agent-org-mini--danger"
              onClick={() => clearPhoto(tier, index)}
            >
              Clear
            </button>
          ) : null}
          {opts.showRemove !== false && tier !== "chief" ? (
            <button
              type="button"
              className="agent-org-mini agent-org-mini--danger"
              onClick={() => removePerson(tier, index)}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const execs = org.executives.slice(0, 3);
  while (execs.length < 3) {
    execs.push({
      id: `exec-slot-${execs.length}`,
      name: "",
      title: "",
    });
  }

  return (
    <div className="agent-org-wrap">
      <div className="agent-org-header">
        <div>
          <h2 className="agent-org-title">Agent command tree</h2>
          <p className="agent-org-sub">
            Chief → executives → directors → workers. Drag between tiers. Gold/cyan glow on nodes
            follows KV traffic (ingest → worker, approve → manager → executive). Names and titles
            save in this browser only. Use the live rail above for department Worker / Manager /
            Executive lines tied to the agentic event log.
          </p>
        </div>
        <button
          type="button"
          className="agent-org-add"
          onClick={() =>
            setOrg((o) => ({ ...o, workers: [...o.workers, newWorker()] }))
          }
        >
          + Add worker
        </button>
      </div>

      <div className="agent-org-body">
        <div
          className={`agent-org-tier agent-org-drop${dragOver === "chief" ? " agent-org-drop--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("chief");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => onDropTier(e, "chief")}
        >
          {renderNode(org.chief, "chief", 0, { draggable: false, showRemove: false })}
        </div>

        <div className="agent-org-connector">
          <div className="agent-org-connector-line" />
        </div>
        <div className="agent-org-connector-fork" aria-hidden />

        <div
          className={`agent-org-tier agent-org-drop${dragOver === "executives" ? " agent-org-drop--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("executives");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => onDropTier(e, "executives")}
        >
          {execs.map((p, i) => renderNode(p, "executives", i, {}))}
        </div>

        <div className="agent-org-connector">
          <div className="agent-org-connector-line" />
        </div>
        <div className="agent-org-connector-fork" aria-hidden />

        <div
          className={`agent-org-tier agent-org-drop${dragOver === "managers" ? " agent-org-drop--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("managers");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => onDropTier(e, "managers")}
        >
          {org.managers.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.8rem", width: "100%", textAlign: "center" }}>
              Drop agents here for director level — or they stay as workers below.
            </p>
          ) : null}
          {org.managers.map((p, i) => renderNode(p, "managers", i, {}))}
        </div>

        <div className="agent-org-connector">
          <div className="agent-org-connector-line" />
        </div>
        <div className="agent-org-connector-fork" aria-hidden />

        <div
          className={`agent-org-tier agent-org-drop${dragOver === "workers" ? " agent-org-drop--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("workers");
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => onDropTier(e, "workers")}
        >
          {org.workers.map((p, i) => renderNode(p, "workers", i, {}))}
        </div>

        <p className="agent-org-live">
          {traffic[0]
            ? `Latest: ${traffic[0].action} · ${new Date(traffic[0].t).toLocaleTimeString()}`
            : "No traffic yet — POST /api/agent-update to see live movement."}
        </p>
      </div>
    </div>
  );
}
