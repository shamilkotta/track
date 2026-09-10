import { errorResponse, json, requireApiUser } from "@/lib/http";
import { listLearningSchedule } from "@/lib/learning-store";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const url = new URL(request.url);
    return json(
      await listLearningSchedule(user.id, {
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
