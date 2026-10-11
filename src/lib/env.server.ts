// SERVER-ONLY. Reads a runtime setting from every place a host may put it:
//  1. process.env (Node hosts, and Cloudflare Workers when populated), then
//  2. the Cloudflare Workers `env` object, which Nitro exposes on
//     globalThis.__env__ for every request (works even if process.env is empty).
if (typeof window !== "undefined") {
  throw new Error("env.server.ts must not be imported in the browser bundle");
}

function workerEnv(): Record<string, unknown> {
  const e = (globalThis as { __env__?: unknown }).__env__;
  return e && typeof e === "object" ? (e as Record<string, unknown>) : {};
}

export function getEnv(name: string): string {
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim();
  const fromCf = workerEnv()[name];
  return typeof fromCf === "string" ? fromCf.trim() : "";
}

// Names only (never values) — used by /api/health to show what the host passed in.
export function visibleEnvNames(): { process_env: string[]; cloudflare_env: string[] } {
  const p = typeof process !== "undefined" ? Object.keys(process.env ?? {}) : [];
  return { process_env: p.sort(), cloudflare_env: Object.keys(workerEnv()).sort() };
}
