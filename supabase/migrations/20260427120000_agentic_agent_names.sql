-- Agent display names (mirrors `xalura-agentic/config/agents.json`) for hosts with read-only filesystem (e.g. Cloudflare Workers).
-- Read/write via SUPABASE_SERVICE_ROLE_KEY from API routes (same pattern as `agentic_topic_bank`).

create table if not exists public.agentic_agent_names (
  id text primary key default 'default',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.agentic_agent_names is 'Full `AgentNamesConfig` JSON. Service role; survives read-only edge filesystems.';

alter table public.agentic_agent_names enable row level security;
