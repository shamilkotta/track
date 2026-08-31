import { errorResponse, json, requireApiUser } from "@/lib/http";
import { loadWorkspace } from "@/lib/workspace-store";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return json(await loadWorkspace(user));
  } catch (error) {
    return errorResponse(error);
  }
}
