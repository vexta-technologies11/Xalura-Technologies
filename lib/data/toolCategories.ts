import { createClient } from "@/lib/supabase/server";
import { TOOLS } from "./tools";

export type ToolCategory = {
  id: string;
  name: string;
  display_order: number;
  items: {
    id: string;
    tool_id: string;
    display_order: number;
  }[];
};

export async function getToolCategories(): Promise<ToolCategory[]> {
  const supabase = createClient();
  const { data: cats, error } = await supabase
    .from("tool_categories")
    .select("*, items:tool_category_items(*)")
    .order("display_order", { ascending: true });

  if (error || !cats) return [];
  return cats.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
    display_order: c.display_order as number,
    items: (((c.items as Array<Record<string, unknown>>) || []).sort(
      (a, b) => (a.display_order as number) - (b.display_order as number),
    ) as ToolCategory["items"]),
  }));
}

export function getToolById(toolId: string) {
  return TOOLS.find((t) => t.id === toolId) || null;
}

export function getToolName(toolId: string) {
  const t = getToolById(toolId);
  return t ? t.name : toolId;
}
