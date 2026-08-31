import { env } from "cloudflare:workers";

export type AppEnv = Cloudflare.Env;

export function getEnv(): AppEnv {
  if (!env.DB) {
    throw new Error("D1 binding DB is missing");
  }
  if (!env.FILES) {
    throw new Error("R2 binding FILES is missing");
  }
  if (typeof env.BETTER_AUTH_SECRET !== "string" || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }
  if (typeof env.BETTER_AUTH_URL !== "string" || env.BETTER_AUTH_URL.length === 0) {
    throw new Error("BETTER_AUTH_URL is missing");
  }
  return env;
}
