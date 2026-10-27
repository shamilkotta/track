import { webhookConfig } from "@/lib/clients/env";

const TIMEOUT_MS = 8000;

export type DeliveryResult = { ok: true } | { ok: false; error: string };

// trackr -> client-hunter. Server-side only. Both headers carry the same key.
export async function deliverEvent(payloadJson: string): Promise<DeliveryResult> {
  const config = webhookConfig();
  if (!config) return { ok: false, error: "webhook not configured" };
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.key}`,
        "x-automation-key": config.key,
      },
      body: payloadJson,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return { ok: true };
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (error) {
    const message = error instanceof Error ? error.name : "fetch failed";
    return { ok: false, error: message === "TimeoutError" ? "timeout" : "unreachable" };
  }
}
