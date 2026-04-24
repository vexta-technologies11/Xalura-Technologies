import { createServiceClient } from "@/lib/supabase/service";
import type { TopicBankFile } from "@/xalura-agentic/lib/contentWorkflow/types";

const TABLE = "agentic_topic_bank";
const ROW_ID = "default";

/** When true, topic bank reads/writes go to Supabase (survives read-only edge filesystems). */
export function topicBankSupabaseEnabled(): boolean {
  const v = process.env["AGENTIC_TOPIC_BANK_USE_SUPABASE"]?.trim().toLowerCase();
  return v === "true" || v === "1";
}

function isValidTopicBankPayload(raw: unknown): raw is TopicBankFile {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return Array.isArray(o["topics"]);
}

export async function fetchTopicBankFromSupabase(): Promise<TopicBankFile | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) {
    console.error("[agentic_topic_bank] select:", error.message);
    return null;
  }
  const raw = data?.data;
  if (!isValidTopicBankPayload(raw)) return null;
  return raw;
}

export async function upsertTopicBankToSupabase(
  bank: TopicBankFile,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase service client unavailable (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)",
    };
  }
  const { error } = await supabase.from(TABLE).upsert(
    {
      id: ROW_ID,
      data: bank as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Health: row exists with a valid `topics` array (may be empty). */
export async function topicBankSupabaseRowReadable(): Promise<boolean> {
  if (!topicBankSupabaseEnabled()) return false;
  const b = await fetchTopicBankFromSupabase();
  return b != null;
}
