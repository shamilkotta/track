import { errorResponse, json, requireApiUser } from "@/lib/http";
import { deleteSavedView } from "@/lib/workspace-store";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    await deleteSavedView(user.id, id);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
