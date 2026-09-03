export type AppEnv = Cloudflare.Env;

let workerEnv: AppEnv | null = null;

try {
  const { env } = await import("cloudflare:workers");
  workerEnv = env as AppEnv;
} catch {
  // Not in the Workers runtime (e.g. nlite prerender in Node).
}

export function getEnv(): AppEnv {
  if (!workerEnv) {
    throw new Error("Cloudflare env is not available");
  }
  if (!workerEnv.DB) {
    throw new Error("D1 binding DB is missing");
  }
  if (!workerEnv.FILES) {
    throw new Error("R2 binding FILES is missing");
  }
  if (
    typeof workerEnv.BETTER_AUTH_SECRET !== "string" ||
    workerEnv.BETTER_AUTH_SECRET.length < 32
  ) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }
  if (typeof workerEnv.BETTER_AUTH_URL !== "string" || workerEnv.BETTER_AUTH_URL.length === 0) {
    throw new Error("BETTER_AUTH_URL is missing");
  }
  return workerEnv;
}
