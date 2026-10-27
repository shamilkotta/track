import { asRecord, errorResponse, json, readJson } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { logReply } from "@/lib/clients/store";

// log_reply
export async function POST(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const body = asRecord(await readJson(request));
    return json(await logReply(userId, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
