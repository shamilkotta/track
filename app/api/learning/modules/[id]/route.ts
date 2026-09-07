import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { deleteLearningModule, updateLearningModule } from "@/lib/learning-store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const body = asRecord(await readJson(request));
    return json(await updateLearningModule(user.id, id, body));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    return json(await deleteLearningModule(user.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}
