import { auth } from "@/lib/auth";
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

function presentedKey(request: Request) {
  const bearer = /^Bearer\s+(.+)$/i.exec((request.headers.get("authorization") ?? "").trim());
  const key = bearer?.[1] ?? request.headers.get("x-api-key") ?? "";
  return key.trim() || null;
}

// Legacy app-level key. Only honoured while both AGENT_API_KEY and OWNER_USER_ID are
// set, so it can be retired by unsetting either secret. Hashing both sides keeps the
// comparison fixed-length and constant-time.
async function legacyOwner(key: string) {
  const expected = agentApiKey();
  const owner = ownerUserId();
  if (!expected || !owner) return null;
  const [given, wanted] = await Promise.all([digest(key), digest(expected)]);
  return constantTimeEqual(given, wanted) ? owner : null;
}

// client-hunter -> trackr. Resolves the user the agent writes as from a user-owned
// API key (Settings → API keys).
export async function requireAgent(request: Request) {
  const key = presentedKey(request);
  if (!key) throw new HttpError(401, "missing api key");

  const legacy = await legacyOwner(key);
  if (legacy) return { userId: legacy };

  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) throw new HttpError(401, "bad key");
  return { userId: result.key.referenceId };
}
