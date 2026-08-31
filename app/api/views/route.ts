import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { createSavedView } from "@/lib/workspace-store";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    return json(await createSavedView(user.id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
