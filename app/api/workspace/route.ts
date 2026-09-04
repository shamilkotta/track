import { errorResponse, json, requireApiUser } from "@/lib/http";
import { loadWorkspaceSummary } from "@/lib/workspace-store";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return json(await loadWorkspaceSummary(user));
  } catch (error) {
    return errorResponse(error);
  }
}
