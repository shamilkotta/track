import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import { getEnv, type AppEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

const cliSecret = "trackr-cli-placeholder-secret-do-not-use";

function missingBinding<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get() {
      throw new Error(`${name} is only available inside the Cloudflare Worker runtime`);
    },
  });
}

function cliEnv(): AppEnv {
  return {
    DB: missingBinding<AppEnv["DB"]>("DB"),
    FILES: missingBinding<AppEnv["FILES"]>("FILES"),
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? cliSecret,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  };
}

function resolveEnv(): AppEnv {
  try {
    return getEnv();
  } catch {
    return cliEnv();
  }
}

function runBackground(promise: Promise<unknown>) {
  void import("cloudflare:workers")
    .then(({ waitUntil }) => waitUntil(promise))
    .catch(() => {
      void promise;
    });
}

function createAuth() {
  const env = resolveEnv();
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
        handler: runBackground,
      },
    },
  });
}

export const auth = createAuth();

export type Session = typeof auth.$Infer.Session;
