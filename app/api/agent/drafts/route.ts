import { asRecord, errorResponse, json, readJson } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { addDraft, listDraftsForAgent } from "@/lib/clients/store";

// list_drafts: every version for a lead, oldest first; optional kind filter
export async function GET(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const url = new URL(request.url);
    const leadId = url.searchParams.get("lead_id") ?? "";
    const kind = url.searchParams.get("kind") || null;
    return json(await listDraftsForAgent(userId, leadId, kind));
  } catch (error) {
    return errorResponse(error);
  }
}

// add_draft
export async function POST(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const body = asRecord(await readJson(request));
    return json(await addDraft(userId, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
