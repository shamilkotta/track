import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { waitUntil } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { getEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

function createAuth() {
  const env = getEnv();
  return betterAuth({
    appName: "Trackr",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema }), {
      provider: "sqlite",
      schema,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 256,
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        title: {
          type: "string",
          required: false,
          defaultValue: "",
          input: true,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
        strategy: "compact",
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    },
    trustedOrigins: (request) => {
      const origins = new Set([env.BETTER_AUTH_URL]);
      const headerOrigin = request?.headers.get("origin");
      if (headerOrigin) {
        try {
          const host = new URL(headerOrigin).hostname;
          if (host === "localhost" || host === "127.0.0.1") origins.add(headerOrigin);
        } catch {
          // ignore invalid Origin
        }
      }
      return [...origins];
    },
    advanced: {
      database: {
        generateId: "uuid",
      },
      useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
      backgroundTasks: {
        handler: waitUntil,
      },
    },
  });
}

export const auth = createAuth();

export type Session = typeof auth.$Infer.Session;
