"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AgenticHierarchyLive } from "@/components/admin/AgenticHierarchyLive";
import { AgenticPublishBar } from "@/components/admin/AgenticPublishBar";
import Link from "next/link";
import "./agent-org-chart.css";

export function AiDashboardClient() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="admin-ai-dashboard-fullbleed">
      <Link href="/admin/ai-dashboard/settings" className="admin-ai-dashboard-settings-link">
        API keys
      </Link>
      <AgenticPublishBar />
      <AgenticHierarchyLive />
    </div>
  );
}
