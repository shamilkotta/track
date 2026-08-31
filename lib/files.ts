import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";

const maxFileBytes = 10 * 1024 * 1024;

const resumeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const coverTypes = new Set([...resumeTypes, "text/plain"]);

function safeFileName(name: string) {
  const cleaned = name.replace(/[/\\]/g, "_").trim();
  return cleaned.slice(0, 180) || "file";
}

function assertFile(file: File, kinds: Set<string>) {
  if (file.size <= 0) throw new HttpError(400, "File is empty");
  if (file.size > maxFileBytes) throw new HttpError(400, "File must be 10MB or smaller");
  if (file.type && !kinds.has(file.type)) {
    throw new HttpError(400, "Use a PDF, Word, or text file");
  }
}

export async function putUserFile(input: {
  userId: string;
  folder: "resumes" | "cover-letters";
  id: string;
  file: File;
  kinds: "resume" | "cover";
}) {
  assertFile(input.file, input.kinds === "resume" ? resumeTypes : coverTypes);
  const fileName = safeFileName(input.file.name);
  const objectKey = `${input.userId}/${input.folder}/${input.id}/${fileName}`;
  const env = getEnv();
  await env.FILES.put(objectKey, await input.file.arrayBuffer(), {
    httpMetadata: {
      contentType: input.file.type || "application/octet-stream",
    },
    customMetadata: {
      userId: input.userId,
      originalName: fileName,
    },
  });
  return {
    fileName,
    objectKey,
    contentType: input.file.type || "application/octet-stream",
  };
}

export async function getUserFile(objectKey: string, userId: string) {
  if (!objectKey.startsWith(`${userId}/`)) {
    throw new HttpError(403, "You cannot access this file");
  }
  const object = await getEnv().FILES.get(objectKey);
  if (!object) throw new HttpError(404, "File not found");
  return object;
}

export async function deleteUserFile(objectKey: string | null | undefined) {
  if (!objectKey) return;
  await getEnv().FILES.delete(objectKey);
}

export async function fileResponse(
  object: Awaited<ReturnType<typeof getUserFile>>,
  downloadName: string,
) {
  const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
  const body = await object.arrayBuffer();
  return new Response(body, {
    headers: {
      "content-type": contentType,
      etag: object.httpEtag,
      "content-disposition": `inline; filename="${downloadName.replace(/"/g, "")}"`,
    },
  });
}
