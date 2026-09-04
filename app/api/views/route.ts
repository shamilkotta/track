import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { createSavedView, listSavedViews } from "@/lib/workspace-store";
import { isSavedViewScreen } from "@/lib/domain";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const screenParam = new URL(request.url).searchParams.get("screen");
    const screen = screenParam && isSavedViewScreen(screenParam) ? screenParam : undefined;
    return json(await listSavedViews(user.id, screen));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    return json(await createSavedView(user.id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
