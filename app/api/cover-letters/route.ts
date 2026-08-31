import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { createCoverLetter } from "@/lib/workspace-store";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const nameValue = form.get("name");
      return json(
        await createCoverLetter(user.id, {
          name: typeof nameValue === "string" ? nameValue : undefined,
          file: file instanceof File ? file : undefined,
        }),
        201,
      );
    }
    const body = asRecord(await readJson(request));
    return json(
      await createCoverLetter(user.id, {
        name: typeof body.name === "string" ? body.name : undefined,
        body: typeof body.body === "string" ? body.body : undefined,
      }),
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
