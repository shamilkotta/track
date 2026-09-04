import { asRecord, errorResponse, json, readJson, requireApiUser, requireString } from "@/lib/http";
import { createCompany, listCompanies } from "@/lib/workspace-store";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return json(await listCompanies(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    return json(
      await createCompany(user.id, {
        name: requireString(body, "name"),
        website: typeof body.website === "string" ? body.website : "",
        location: typeof body.location === "string" ? body.location : "",
      }),
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
