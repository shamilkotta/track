import { errorResponse, json } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { draftChainForAgent } from "@/lib/clients/store";

// get_draft: the draft plus every version in its lead + kind chain, oldest first.
// Not owned or missing is 404 so ids don't leak.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAgent(request);
    const { id } = await context.params;
    return json(await draftChainForAgent(userId, id));
  } catch (error) {
    return errorResponse(error);
  }
}
