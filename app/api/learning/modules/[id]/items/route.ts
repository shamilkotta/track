import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { createLearningItem } from "@/lib/learning-store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const body = asRecord(await readJson(request));
    return json(await createLearningItem(user.id, id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
