import { HttpError } from "@/lib/http";
import { agentApiKey, ownerUserId } from "@/lib/clients/env";

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (left: ArrayBufferView, right: ArrayBufferView) => boolean;
  };
  if (typeof subtle.timingSafeEqual === "function") return subtle.timingSafeEqual(a, b);
  let diff = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

// client-hunter -> trackr. Returns the user the agent writes as.
export async function requireAgent(request: Request) {
  const expected = agentApiKey();
  const owner = ownerUserId();
  if (!expected || !owner) throw new HttpError(503, "agent api not configured");
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  // hash both sides so the comparison is fixed-length and constant-time
  const [given, wanted] = await Promise.all([digest(match?.[1] ?? ""), digest(expected)]);
  if (!match || !constantTimeEqual(given, wanted)) throw new HttpError(401, "bad key");
  return { userId: owner };
}
