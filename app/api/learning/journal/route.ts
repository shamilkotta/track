import { asRecord, errorResponse, json, readJson, requireApiUser } from "@/lib/http";
import { createLearningJournalEntry, listLearningJournal } from "@/lib/learning-store";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return json(await listLearningJournal(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = asRecord(await readJson(request));
    return json(await createLearningJournalEntry(user.id, body), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
