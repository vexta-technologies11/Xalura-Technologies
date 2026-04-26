export type TeamMemberRow = {
  id: string;
  name: string;
  title: string;
  /** Filter key (must match a filter `id` from team page, except "all" shows everyone). */
  department: string;
  region_badge: string | null;
  avatar_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
};

export type TeamPageFilter = {
  id: string;
  label: string;
};
