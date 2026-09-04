import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { parseIdList } from "@/lib/mappers";
import { bulkApplications, createApplication, listApplications } from "@/lib/workspace-store";
import type { ArchiveScope } from "@/lib/domain";

function parseScope(value: string | null): ArchiveScope {
  if (value === "active" || value === "archived" || value === "all") return value;
  return "all";
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const scope = parseScope(new URL(request.url).searchParams.get("scope"));
    return json(await listApplications(user.id, scope));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    return json(await createApplication(user.id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    const action = body.action;
    if (action !== "archive" && action !== "unarchive" && action !== "delete") {
      return json({ error: "Unknown bulk action" }, 400);
    }
    return json(await bulkApplications(user.id, parseIdList(body.ids), action));
  } catch (error) {
    return errorResponse(error);
  }
}
