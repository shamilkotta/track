import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { deleteWishlist, getWishlist, updateWishlist } from "@/lib/workspace-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    return json(await getWishlist(user.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const body = asRecord(await readJson(request));
    return json(await updateWishlist(user.id, id, body));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    await deleteWishlist(user.id, id);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
