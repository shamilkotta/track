import { asRecord, errorResponse, json, readJson } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { agentLead, leadRef, updateDeal } from "@/lib/clients/store";

// update_deal
export async function POST(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const body = asRecord(await readJson(request));
    return json({ lead: agentLead(await updateDeal(userId, leadRef(body), body)) });
  } catch (error) {
    return errorResponse(error);
  }
}
