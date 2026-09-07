import type { ArchiveScope } from "@/lib/domain";
import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { createLearningPath, listLearningPaths } from "@/lib/learning-store";

function parseScope(value: string | null): ArchiveScope {
  if (value === "active" || value === "archived" || value === "all") return value;
  return "active";
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const scope = parseScope(new URL(request.url).searchParams.get("scope"));
    return json(await listLearningPaths(user.id, scope));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    return json(await createLearningPath(user.id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
