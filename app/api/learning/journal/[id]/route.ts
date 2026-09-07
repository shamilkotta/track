import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { deleteLearningJournalEntry, updateLearningJournalEntry } from "@/lib/learning-store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const body = asRecord(await readJson(request));
    return json(await updateLearningJournalEntry(user.id, id, body));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    await deleteLearningJournalEntry(user.id, id);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
