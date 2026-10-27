import { auth } from "@/lib/auth";
import { HttpError } from "@/lib/http";

function presentedKey(request: Request) {
  const bearer = /^Bearer\s+(.+)$/i.exec((request.headers.get("authorization") ?? "").trim());
  const key = bearer?.[1] ?? request.headers.get("x-api-key") ?? "";
  return key.trim() || null;
}

// client-hunter -> trackr. Resolves the user the agent writes as from a user-owned
// API key (Settings → API keys).
export async function requireAgent(request: Request) {
  const key = presentedKey(request);
  if (!key) throw new HttpError(401, "missing api key");
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) throw new HttpError(401, "bad key");
  return { userId: result.key.referenceId };
}
