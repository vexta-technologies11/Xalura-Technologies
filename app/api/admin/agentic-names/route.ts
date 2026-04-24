import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  loadAgentNamesConfig,
  saveAgentNamesConfig,
  setPersonaNameInConfig,
} from "@/xalura-agentic/lib/agentNames";

export const dynamic = "force-dynamic";

/**
 * Set one display name in `xalura-agentic/config/agents.json` (used by the hierarchy
 * dashboard and Gemini `assignedName`). Requires a logged-in admin.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { personaId?: string; name?: string };
  try {
    body = (await request.json()) as { personaId?: string; name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const personaId = typeof body.personaId === "string" ? body.personaId.trim() : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (!personaId) {
    return NextResponse.json({ error: "personaId is required" }, { status: 400 });
  }

  const cwd = process.cwd();
  const config = loadAgentNamesConfig(cwd);
  try {
    setPersonaNameInConfig(config, personaId, name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const saved = saveAgentNamesConfig(cwd, config);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, agentNames: loadAgentNamesConfig(cwd) });
}
