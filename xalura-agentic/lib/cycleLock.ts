/**
 * Serializes cycle-state RMW (and any other critical section) so parallel
 * `recordApproval` calls cannot interleave and corrupt `cycle-state.json`.
 */
let chain: Promise<unknown> = Promise.resolve();

export function withCycleLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const run = () => Promise.resolve(fn());
  const p = chain.then(run, run) as Promise<T>;
  chain = p.then(
    () => undefined,
    () => undefined,
  );
  return p;
}
