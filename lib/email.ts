import { getEnv, type AppEnv } from "@/lib/env";

export type SendAppEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function resolveEmailEnv(): Pick<AppEnv, "EMAIL" | "EMAIL_FROM" | "EMAIL_FROM_NAME"> {
  const env = getEnv();
  if (!env.EMAIL) {
    throw new Error("EMAIL binding is missing");
  }
  if (typeof env.EMAIL_FROM !== "string" || env.EMAIL_FROM.length === 0) {
    throw new Error("EMAIL_FROM is missing");
  }
  return env;
}

export async function sendAppEmail(input: SendAppEmailInput) {
  const env = resolveEmailEnv();
  const fromName =
    typeof env.EMAIL_FROM_NAME === "string" && env.EMAIL_FROM_NAME.length > 0
      ? env.EMAIL_FROM_NAME
      : undefined;

  await env.EMAIL.send({
    to: input.to,
    from: { email: env.EMAIL_FROM, name: fromName ?? "Trackr" },
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
