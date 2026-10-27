import { asRecord, errorResponse, json, readJson } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { textField } from "@/lib/clients/route-helpers";
import { addNote, leadRef } from "@/lib/clients/store";

// add_note (agent-authored; no webhook)
export async function POST(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const body = asRecord(await readJson(request));
    return json(await addNote(userId, leadRef(body), textField(body, "body"), "agent"), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
