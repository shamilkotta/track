import { errorResponse, json } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { sinceParam } from "@/lib/clients/route-helpers";
import { agentEvent, listEvents } from "@/lib/clients/store";

// list_events: pull fallback for the webhook, delivered or not
export async function GET(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const events = await listEvents(userId, sinceParam(new URL(request.url)));
    return json({ events: events.map(agentEvent) });
  } catch (error) {
    return errorResponse(error);
  }
}
