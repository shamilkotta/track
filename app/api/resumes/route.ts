import { errorResponse, json, requireApiUser } from "@/lib/http";
import { createResume } from "@/lib/workspace-store";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Choose a resume file" }, 400);
    }
    return json(await createResume(user.id, file), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
