import { asRecord, errorResponse, HttpError, json, readJson, requireApiUser } from "@/lib/http";
import { textField } from "@/lib/clients/route-helpers";
import {
  addNote,
  dropLead,
  holdLead,
  markWon,
  moveToInTalks,
  reviveLead,
  setTasks,
  updateDeal,
} from "@/lib/clients/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const body = asRecord(await readJson(request));
    switch (body.action) {
      case "drop":
        return json(await dropLead(user.id, id, body.reason, textField(body, "note")));
      case "revive":
        return json(await reviveLead(user.id, id));
      case "hold":
        return json(await holdLead(user.id, id, textField(body, "note")));
      case "note":
        return json(await addNote(user.id, id, textField(body, "body"), "shamil"), 201);
      case "deal":
        return json(await updateDeal(user.id, { leadId: id }, asRecord(body.deal)));
      case "in_talks":
        return json(await moveToInTalks(user.id, id));
      case "won":
        return json(await markWon(user.id, id));
      case "tasks":
        return json(await setTasks(user.id, { leadId: id }, body.tasks));
      default:
        throw new HttpError(400, "unknown action");
    }
  } catch (error) {
    return errorResponse(error);
  }
}
