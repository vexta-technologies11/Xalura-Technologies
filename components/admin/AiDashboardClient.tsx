"use client";

import { AgenticHierarchyLive } from "@/components/admin/AgenticHierarchyLive";
import { AgenticPublishBar } from "@/components/admin/AgenticPublishBar";
import Link from "next/link";
import "./agent-org-chart.css";

export function AiDashboardClient() {
  return (
    <div className="admin-ai-dashboard-fullbleed">
      <Link href="/admin/ai-dashboard/settings" className="admin-ai-dashboard-settings-link">
        API keys
      </Link>
      <div className="admin-ai-dashboard-merged">
        <AgenticPublishBar />
        <AgenticHierarchyLive />
      </div>
    </div>
  );
}
