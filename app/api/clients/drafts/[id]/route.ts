import { asRecord, errorResponse, HttpError, json, readJson, requireApiUser } from "@/lib/http";
import { textField } from "@/lib/clients/route-helpers";
import { approveDraft, editDraft, reviseDraft } from "@/lib/clients/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const body = asRecord(await readJson(request));
    switch (body.action) {
      case "approve":
        return json(await approveDraft(user.id, id, body));
      case "revise":
        return json(await reviseDraft(user.id, id, textField(body, "note")));
      case "edit":
        return json(await editDraft(user.id, id, body), 201);
      default:
        throw new HttpError(400, "unknown action");
    }
  } catch (error) {
    return errorResponse(error);
  }
}
