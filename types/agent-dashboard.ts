export type AgentUpdateRow = {
  id: string;
  employee_id: string | null;
  agent_external_id: string;
  activity_text: string;
  activity_type: string;
  review_status: "pending" | "approved" | "declined";
  reviewed_at: string | null;
  created_at: string;
};

export type AgentWorkloadDayRow = {
  employee_id: string;
  day: string;
  update_count: number;
};

export type AgentApiKeyRow = {
  id: string;
  employee_id: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
};
