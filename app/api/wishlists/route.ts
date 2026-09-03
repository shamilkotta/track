import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { parseIdList } from "@/lib/mappers";
import { bulkWishlists, createWishlist } from "@/lib/workspace-store";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    return json(await createWishlist(user.id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    const action = body.action;
    if (action !== "archive" && action !== "unarchive" && action !== "delete") {
      return json({ error: "Unknown bulk action" }, 400);
    }
    return json(await bulkWishlists(user.id, parseIdList(body.ids), action));
  } catch (error) {
    return errorResponse(error);
  }
}
