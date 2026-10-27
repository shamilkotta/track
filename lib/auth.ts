import { betterAuth } from "better-auth/minimal";
import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import { getEnv, type AppEnv } from "@/lib/env";
import { sendAppEmail } from "@/lib/email";
import * as schema from "@/lib/db/schema";

export const AGENT_KEY_PREFIX = "trk_";

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
    EMAIL: missingBinding<AppEnv["EMAIL"]>("EMAIL"),
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? cliSecret,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
    EMAIL_FROM: process.env.EMAIL_FROM ?? "",
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? "",
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
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAppEmail({
          to: user.email,
          subject: "Reset your Trackr password",
          text: `Hi ${user.name},\n\nReset your Trackr password:\n${url}\n\nIf you did not request this, you can ignore this email.`,
          html: `<p>Hi ${user.name},</p><p><a href="${url}">Reset your password</a> for Trackr.</p><p>If you did not request this, you can ignore this email.</p>`,
        });
      },
      customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
        ...coreFields,
        ...additionalFields,
        id,
      }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAppEmail({
          to: user.email,
          subject: "Verify your Trackr email",
          text: `Hi ${user.name},\n\nVerify your email to finish setting up Trackr:\n${url}\n\nIf you did not create an account, you can ignore this email.`,
          html: `<p>Hi ${user.name},</p><p><a href="${url}">Verify your email</a> to finish setting up Trackr.</p><p>If you did not create an account, you can ignore this email.</p>`,
        });
      },
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
        "/send-verification-email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
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
    plugins: [
      apiKey({
        // agent API keys (client-hunter). Verified by lib/clients/agent-auth.ts, which
        // reads Bearer or x-api-key itself; keys are never turned into sessions.
        defaultPrefix: AGENT_KEY_PREFIX,
        startingCharactersConfig: { charactersLength: AGENT_KEY_PREFIX.length + 4 },
        requireName: true,
        maximumNameLength: 64,
        enableSessionForAPIKeys: false,
        // the plugin defaults to 10 requests a day per key, far below what the agent sends
        rateLimit: { enabled: false },
      }),
    ],
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
