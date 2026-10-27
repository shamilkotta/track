import { asRecord, errorResponse, json, readJson } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { addDraft } from "@/lib/clients/store";

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
