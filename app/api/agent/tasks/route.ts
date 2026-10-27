import { asRecord, errorResponse, json, readJson } from "@/lib/http";
import { requireAgent } from "@/lib/clients/agent-auth";
import { leadRef, setTasks } from "@/lib/clients/store";

// set_tasks (full replace)
export async function PUT(request: Request) {
  try {
    const { userId } = await requireAgent(request);
    const body = asRecord(await readJson(request));
    return json({ tasks: await setTasks(userId, leadRef(body), body.tasks) });
  } catch (error) {
    return errorResponse(error);
  }
}
