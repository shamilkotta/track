import { asRecord, errorResponse, HttpError, json, readJson, requireApiUser } from "@/lib/http";
import { deleteLearningResource, updateLearningResource } from "@/lib/learning-store";
import type { LearningResourcePatch } from "@/lib/domain";

function parsePatch(body: Record<string, unknown>): LearningResourcePatch {
  if (typeof body.title !== "string" || !body.title.trim()) {
    throw new HttpError(400, "Title is required");
  }
  return { title: body.title.trim() };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const body = parsePatch(asRecord(await readJson(request)));
    return json(await updateLearningResource(user.id, id, body));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    await deleteLearningResource(user.id, id);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
