import { asRecord, errorResponse, HttpError, json, readJson, requireApiUser } from "@/lib/http";
import { createLearningResource, listLearningResources } from "@/lib/learning-store";
import type { LearningResourceCreate } from "@/lib/domain";

function parseCreate(body: Record<string, unknown>): LearningResourceCreate {
  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new HttpError(400, "Title is required");
  }
  return {
    title: body.title.trim(),
    pathId: typeof body.pathId === "string" ? body.pathId : body.pathId === null ? null : undefined,
    itemId: typeof body.itemId === "string" ? body.itemId : body.itemId === null ? null : undefined,
    afterResourceId:
      typeof body.afterResourceId === "string"
        ? body.afterResourceId
        : body.afterResourceId === null
          ? null
          : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return json(await listLearningResources(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = parseCreate(asRecord(await readJson(request)));
    return json(await createLearningResource(user.id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
