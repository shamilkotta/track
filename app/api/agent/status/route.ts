import { asRecord, errorResponse, json, readJson } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { agentLead, updateStatus } from "@/lib/clients/store";

// update_status
export async function POST(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const body = asRecord(await readJson(request));
    return json({ lead: agentLead(await updateStatus(userId, body)) });
  } catch (error) {
    return errorResponse(error);
  }
}
