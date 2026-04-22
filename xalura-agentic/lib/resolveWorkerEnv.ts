import { getCloudflareContext } from "@opennextjs/cloudflare";

const ERR_TRUNC = 320;

function truncateErr(e: unknown): string | undefined {
  const msg = e instanceof Error ? e.message : String(e);
  const s = msg.replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  return s.length > ERR_TRUNC ? `${s.slice(0, ERR_TRUNC)}…` : s;
}

export type EnvBindingProbe = {
  /** `typeof` binding; `n/a` when step was not applicable (e.g. context threw before read). */
  binding_type: string;
  /** True only for non-empty trimmed string. */
  nonempty_string: boolean;
};

export type WorkerEnvResolutionTrace = {
  env_var_name: string;
  process_env: { nonempty: boolean };
  cloudflare_workers_virtual: {
    import_ok: boolean;
    import_error_truncated?: string;
    workers_env_object_present: boolean;
    binding: EnvBindingProbe;
  };
  cf_context_async: {
    context_ok: boolean;
    context_error_truncated?: string;
    binding: EnvBindingProbe;
  };
  cf_context_sync: {
    context_ok: boolean;
    context_error_truncated?: string;
    binding: EnvBindingProbe;
  };
  /**
   * First resolution source in priority order used by `resolveWorkerEnv`.
   * `none` means no branch returned a non-empty string.
   */
  first_hit:
    | "process.env"
    | "cloudflare:workers"
    | "cf_context_async"
    | "cf_context_sync"
    | "none";
  /** Plain-language next step; never contains secret values. */
  remediation_hint: string;
};

function probeBinding(v: unknown): EnvBindingProbe {
  const binding_type =
    v === undefined ? "undefined" : v === null ? "null" : typeof v;
  const nonempty_string = typeof v === "string" && !!v.trim();
  return { binding_type, nonempty_string };
}

function naBinding(): EnvBindingProbe {
  return { binding_type: "n/a", nonempty_string: false };
}

function buildRemediationHint(
  name: string,
  t: Omit<WorkerEnvResolutionTrace, "remediation_hint">,
): string {
  if (t.first_hit !== "none") {
    return `Resolved ${name} from ${t.first_hit}.`;
  }
  if (!t.cf_context_async.context_ok) {
    return (
      "OpenNext getCloudflareContext({ async: true }) failed — Worker env bindings may be unreachable " +
      "for this request (ALS / routing). Inspect cf_context_async.context_error_truncated. " +
      "If this is local dev without wrangler, bind vars via .dev.vars."
    );
  }
  if (
    t.process_env.nonempty === false &&
    t.cf_context_async.binding.binding_type === "undefined"
  ) {
    return (
      `No value for ${name} in process.env or Worker env. Add it to the **deployed Worker** ` +
      `(Dashboard → Workers & Pages → your worker → Settings → Variables and Secrets, ` +
      `or \`wrangler secret put ${name}\`). Plain build/CI env alone is not enough for OpenNext on Cloudflare.`
    );
  }
  if (t.cf_context_async.binding.binding_type === "string" && !t.cf_context_async.binding.nonempty_string) {
    return `${name} is bound but is an empty string after trim.`;
  }
  if (
    t.cf_context_async.binding.binding_type !== "string" &&
    t.cf_context_async.binding.binding_type !== "undefined" &&
    t.cf_context_async.binding.binding_type !== "null"
  ) {
    return (
      `${name} is present but not a string (type=${t.cf_context_async.binding.binding_type}). ` +
      "Worker secrets must be text bindings."
    );
  }
  return `Could not resolve ${name}; inspect per-step binding_type in this trace.`;
}

/**
 * Same resolution order as `resolveWorkerEnv`, plus a safe diagnostic trace (no secret values).
 * Each lookup path runs at most once (no duplicate `getCloudflareContext` / workers import).
 */
export async function resolveWorkerEnvWithTrace(name: string): Promise<{
  value: string | undefined;
  trace: WorkerEnvResolutionTrace;
}> {
  const process_nonempty = !!process.env[name]?.trim();
  const direct = process.env[name]?.trim();

  let cw_import_ok = false;
  let cw_import_error: string | undefined;
  let workers_env_object_present = false;
  let cw_binding: EnvBindingProbe = naBinding();
  let cw_value: string | undefined;
  try {
    const m = await import(
      /* webpackIgnore: true */
      "cloudflare:workers",
    );
    cw_import_ok = true;
    const env = (m as { env?: Record<string, unknown> }).env;
    if (env && typeof env === "object") {
      workers_env_object_present = true;
      const v = env[name];
      cw_binding = probeBinding(v);
      if (typeof v === "string" && v.trim()) cw_value = v.trim();
    }
  } catch (e) {
    cw_import_error = truncateErr(e);
    cw_binding = naBinding();
  }

  let async_ok = false;
  let async_err: string | undefined;
  let async_binding: EnvBindingProbe = naBinding();
  let async_env: Record<string, unknown> | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    async_ok = true;
    async_env = env as Record<string, unknown>;
    async_binding = probeBinding(async_env[name]);
  } catch (e) {
    async_err = truncateErr(e);
    async_binding = naBinding();
  }

  let sync_ok = false;
  let sync_err: string | undefined;
  let sync_binding: EnvBindingProbe = naBinding();
  let sync_env: Record<string, unknown> | undefined;
  try {
    const { env } = getCloudflareContext({ async: false });
    sync_ok = true;
    sync_env = env as Record<string, unknown>;
    sync_binding = probeBinding(sync_env[name]);
  } catch (e) {
    sync_err = truncateErr(e);
    sync_binding = naBinding();
  }

  let value: string | undefined;
  let first_hit: WorkerEnvResolutionTrace["first_hit"] = "none";

  if (direct) {
    value = direct;
    first_hit = "process.env";
  } else if (cw_value) {
    value = cw_value;
    first_hit = "cloudflare:workers";
  } else if (async_env) {
    const v = async_env[name];
    if (typeof v === "string" && v.trim()) {
      value = v.trim();
      first_hit = "cf_context_async";
    }
  }
  if (!value && sync_env) {
    const v = sync_env[name];
    if (typeof v === "string" && v.trim()) {
      value = v.trim();
      first_hit = "cf_context_sync";
    }
  }

  const traceBody: Omit<WorkerEnvResolutionTrace, "remediation_hint"> = {
    env_var_name: name,
    process_env: { nonempty: process_nonempty },
    cloudflare_workers_virtual: {
      import_ok: cw_import_ok,
      import_error_truncated: cw_import_error,
      workers_env_object_present,
      binding: cw_binding,
    },
    cf_context_async: {
      context_ok: async_ok,
      context_error_truncated: async_err,
      binding: async_binding,
    },
    cf_context_sync: {
      context_ok: sync_ok,
      context_error_truncated: sync_err,
      binding: sync_binding,
    },
    first_hit,
  };

  const trace: WorkerEnvResolutionTrace = {
    ...traceBody,
    remediation_hint: buildRemediationHint(name, traceBody),
  };

  return { value, trace };
}

export async function probeWorkerEnvResolution(
  name: string,
): Promise<WorkerEnvResolutionTrace> {
  return (await resolveWorkerEnvWithTrace(name)).trace;
}

/**
 * Read a string env var from `process.env` or Cloudflare Worker `env` (OpenNext ALS).
 * Use bracket lookups at call sites so Next/OpenNext do not strip unknown keys at build.
 */
export async function resolveWorkerEnv(name: string): Promise<string | undefined> {
  return (await resolveWorkerEnvWithTrace(name)).value;
}
