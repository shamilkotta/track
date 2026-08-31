import { errorResponse, requireApiUser } from "@/lib/http";
import { fileResponse, getUserFile } from "@/lib/files";
import { getResumeFile } from "@/lib/workspace-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const resume = await getResumeFile(user.id, id);
    const object = await getUserFile(resume.objectKey, user.id);
    return await fileResponse(object, resume.fileName);
  } catch (error) {
    return errorResponse(error);
  }
}
