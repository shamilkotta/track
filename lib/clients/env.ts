import { getEnv } from "@/lib/env";

// Worker secrets for the clients tab. Set with `wrangler secret put`; locally they
// come from .dev.vars (gitignored). They are read only on the server and are never
// serialised into a response.
type ClientsSecrets = {
  CLIENTS_WEBHOOK_URL?: string;
  CLIENTS_WEBHOOK_KEY?: string;
  AGENT_API_KEY?: string;
  OWNER_USER_ID?: string;
};

function secrets(): ClientsSecrets {
  return getEnv() as unknown as ClientsSecrets;
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function webhookConfig() {
  const env = secrets();
  const url = nonEmpty(env.CLIENTS_WEBHOOK_URL);
  const key = nonEmpty(env.CLIENTS_WEBHOOK_KEY);
  return url && key ? { url, key } : null;
}

export function agentApiKey() {
  return nonEmpty(secrets().AGENT_API_KEY);
}

export function ownerUserId() {
  return nonEmpty(secrets().OWNER_USER_ID);
}
