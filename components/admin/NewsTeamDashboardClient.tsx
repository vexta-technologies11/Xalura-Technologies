"use client";

import Link from "next/link";
import { NewsTeamHierarchyLive } from "@/components/admin/NewsTeamHierarchyLive";
import { NewsTeamPublishBar } from "@/components/admin/NewsTeamPublishBar";
import "./agent-org-chart.css";

export function NewsTeamDashboardClient() {
  return (
    <div className="admin-ai-dashboard-fullbleed">
      <Link href="/admin/ai-dashboard" className="admin-ai-dashboard-settings-link">
        Main AI dashboard
      </Link>
      <div className="admin-ai-dashboard-merged">
        <NewsTeamPublishBar />
        <NewsTeamHierarchyLive />
      </div>
    </div>
  );
}
