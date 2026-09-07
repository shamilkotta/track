import { errorResponse, json, requireApiUser } from "@/lib/http";
import { listDueLearningItems } from "@/lib/learning-store";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const url = new URL(request.url);
    return json(
      await listDueLearningItems(user.id, {
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        includeOverdue: url.searchParams.get("overdue") === "1",
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
