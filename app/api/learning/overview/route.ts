import { errorResponse, json, requireApiUser } from "@/lib/http";
import { loadLearningOverview } from "@/lib/learning-store";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return json(await loadLearningOverview(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
