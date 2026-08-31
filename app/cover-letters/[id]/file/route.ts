import { errorResponse, HttpError, requireApiUser } from "@/lib/http";
import { fileResponse, getUserFile } from "@/lib/files";
import { getCoverLetterFile } from "@/lib/workspace-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const { id } = await context.params;
    const letter = await getCoverLetterFile(user.id, id);
    if (!letter.objectKey || !letter.fileName) {
      throw new HttpError(404, "This cover letter has no file");
    }
    const object = await getUserFile(letter.objectKey, user.id);
    return await fileResponse(object, letter.fileName);
  } catch (error) {
    return errorResponse(error);
  }
}
