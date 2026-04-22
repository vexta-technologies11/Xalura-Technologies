"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TrafficEvent } from "@/lib/agentUpdatesStore";
import type { AgentUpdateRow } from "@/types/agent-dashboard";
import { AgentOrgChart } from "@/components/admin/AgentOrgChart";
import "./agent-org-chart.css";

type EmployeeMini = { id: string; name: string };

export function AiDashboardClient({
  initialUpdates,
  employees,
  initialTraffic,
}: {
  initialUpdates: AgentUpdateRow[];
  employees: EmployeeMini[];
  initialTraffic: TrafficEvent[];
}) {
  const router = useRouter();
  const [updates, setUpdates] = useState<AgentUpdateRow[]>(initialUpdates);
  const [traffic, setTraffic] = useState<TrafficEvent[]>(initialTraffic);

  useEffect(() => {
    setUpdates(initialUpdates);
  }, [initialUpdates]);

  useEffect(() => {
    setTraffic(initialTraffic);
  }, [initialTraffic]);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="admin-ai-dashboard-fullbleed">
      <Link
        href="/admin/ai-dashboard/settings"
        className="admin-ai-dashboard-settings-link"
      >
        API keys
      </Link>
      <AgentOrgChart employees={employees} updates={updates} traffic={traffic} />
    </div>
  );
}
