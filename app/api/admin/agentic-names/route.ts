import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertAgentNamesToSupabase } from "@/lib/agenticAgentNamesSupabase";
import { loadAgentNamesResolved } from "@/lib/loadAgentNamesResolved";
import { saveAgentNamesConfig, setPersonaFieldsInConfig } from "@/xalura-agentic/lib/agentNames";
import { isAgenticDiskWritable } from "@/xalura-agentic/lib/agenticDisk";

export const dynamic = "force-dynamic";

type Body = {
  personaId?: string;
  name?: string;
  title?: string;
  avatar?: string;
};

/**
 * Set display fields in `xalura-agentic/config/agents.json` and/or `agentic_agent_names` in Supabase
 * when the deploy filesystem is read-only. Requires a logged-in admin. Send at least one of name, title, avatar.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const personaId = typeof body.personaId === "string" ? body.personaId.trim() : "";
  if (!personaId) {
    return NextResponse.json({ error: "personaId is required" }, { status: 400 });
  }

  const hasName = typeof body.name === "string";
  const hasTitle = typeof body.title === "string";
  const hasAvatar = typeof body.avatar === "string";
  if (!hasName && !hasTitle && !hasAvatar) {
    return NextResponse.json(
      { error: "At least one of name, title, or avatar is required" },
      { status: 400 },
    );
  }

  const cwd = process.cwd();
  const config = await loadAgentNamesResolved(cwd);
  const fields: { name?: string; title?: string; avatar?: string } = {};
  if (hasName) fields.name = body.name;
  if (hasTitle) fields.title = body.title;
  if (hasAvatar) fields.avatar = body.avatar;
  try {
    setPersonaFieldsInConfig(config, personaId, fields);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const diskOk = isAgenticDiskWritable();
  if (diskOk) {
    const saved = saveAgentNamesConfig(cwd, config);
    if (!saved.ok) {
      const up = await upsertAgentNamesToSupabase(config);
      if (!up.ok) {
        return NextResponse.json(
          { error: saved.error + (up.error ? `; ${up.error}` : "") },
          { status: 500 },
        );
      }
    }
  } else {
    const up = await upsertAgentNamesToSupabase(config);
    if (!up.ok) {
      return NextResponse.json({ error: up.error }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, agentNames: await loadAgentNamesResolved(cwd) });
}
