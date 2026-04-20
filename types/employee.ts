export type IconType = "writer" | "seo" | "analyst" | "designer";

export type EmployeeStat = {
  value: string;
  label: string;
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  role_badge: string;
  description: string;
  icon_type: IconType;
  /** Public URL or path, e.g. /avatars/mochi.png or https://… */
  avatar_url?: string | null;
  /** Career-style highlights (figure + copy); optional in DB — merged from defaults by name */
  stats?: EmployeeStat[] | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
};
