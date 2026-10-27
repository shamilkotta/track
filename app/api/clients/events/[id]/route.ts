import { errorResponse, json, requireApiUser } from "@/lib/http";
import { retryEvent } from "@/lib/clients/store";

// manual "retry" from the "not delivered" line
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    return json({ event: await retryEvent(user.id, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
