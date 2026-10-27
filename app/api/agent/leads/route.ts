import { asRecord, errorResponse, json, readJson, HttpError } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { isClientLeadStatus } from "@/lib/clients/domain";
import { sinceParam } from "@/lib/clients/route-helpers";
import { agentLead, listLeadsForAgent, upsertLead } from "@/lib/clients/store";

// list_leads
export async function GET(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || null;
    if (status !== null && !isClientLeadStatus(status)) {
      throw new HttpError(400, "status is not a valid value");
    }
    const leads = await listLeadsForAgent(userId, status, sinceParam(url));
    return json({ leads: leads.map(agentLead) });
  } catch (error) {
    return errorResponse(error);
  }
}

// upsert_lead, keyed by external_ref
export async function PUT(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const body = asRecord(await readJson(request));
    const { lead, created } = await upsertLead(userId, body);
    return json({ lead: agentLead(lead), created }, created ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}
