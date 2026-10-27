import { errorResponse, json, requireApiUser } from "@/lib/http";
import { loadBoard } from "@/lib/clients/store";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return json(await loadBoard(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
