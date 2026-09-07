import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { createLearningResource, listLearningResources } from "@/lib/learning-store";

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
    const body = asRecord(await readJson(request));
    return json(await createLearningResource(user.id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
