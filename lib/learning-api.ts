import {
  isLearningItemKind,
  isLearningItemStatus,
  isLearningPathColor,
  isLearningPathStatus,
  isRecord,
  type ArchiveScope,
  type LearningItem,
  type LearningJournalEntry,
  type LearningOverview,
  type LearningPath,
  type LearningPathDetail,
  type LearningResource,
  type LearningResourceCreate,
  type LearningResourcePatch,
  type LearningScheduleEntry,
} from "@/lib/domain";
import { redirect } from "nlite/navigation";

async function readError(res: Response) {
  const body: unknown = await res.json().catch(() => null);
  if (isRecord(body) && typeof body.error === "string") return body.error;
  return res.statusText || "Request failed";
}

async function api<T>(
  url: string,
  init: RequestInit | undefined,
  parse: (value: unknown) => T,
): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 401) redirect("/sign-in");
  if (!res.ok) throw new Error(await readError(res));
  return parse(await res.json());
}

function str(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function num(record: Record<string, unknown>, key: string, fallback = 0) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseProgress(value: unknown) {
  if (!isRecord(value)) return { totalItems: 0, doneItems: 0, percent: 0 };
  return {
    totalItems: num(value, "totalItems"),
    doneItems: num(value, "doneItems"),
    percent: num(value, "percent"),
  };
}

function parseResource(value: unknown): LearningResource | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string")
    return null;
  return {
    id: value.id,
    pathId: typeof value.pathId === "string" ? value.pathId : null,
    itemId: typeof value.itemId === "string" ? value.itemId : null,
    title: value.title,
    sortOrder: num(value, "sortOrder"),
    createdAt: str(value, "createdAt"),
    updatedAt: str(value, "updatedAt"),
    pathTitle: typeof value.pathTitle === "string" ? value.pathTitle : undefined,
    itemTitle: typeof value.itemTitle === "string" ? value.itemTitle : undefined,
  };
}

function parseItem(value: unknown): LearningItem | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string")
    return null;
  const kind = str(value, "kind", "lesson");
  const status = str(value, "status", "todo");
  const resources = Array.isArray(value.resources)
    ? value.resources.map(parseResource).filter((item): item is LearningResource => item !== null)
    : [];
  return {
    id: value.id,
    pathId: str(value, "pathId"),
    moduleId: str(value, "moduleId"),
    title: value.title,
    description: str(value, "description"),
    kind: isLearningItemKind(kind) ? kind : "lesson",
    status: isLearningItemStatus(status) ? status : "todo",
    dueDate: str(value, "dueDate"),
    estimatedMinutes: num(value, "estimatedMinutes"),
    sortOrder: num(value, "sortOrder"),
    notes: str(value, "notes"),
    completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
    createdAt: str(value, "createdAt"),
    updatedAt: str(value, "updatedAt"),
    resources,
    pathTitle: typeof value.pathTitle === "string" ? value.pathTitle : undefined,
    moduleTitle: typeof value.moduleTitle === "string" ? value.moduleTitle : undefined,
  };
}

function parsePath(value: unknown): LearningPath | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string")
    return null;
  const status = str(value, "status", "draft");
  const color = str(value, "color", "neutral");
  return {
    id: value.id,
    title: value.title,
    description: str(value, "description"),
    goal: str(value, "goal"),
    status: isLearningPathStatus(status) ? status : "draft",
    startDate: str(value, "startDate"),
    targetEndDate: str(value, "targetEndDate"),
    color: isLearningPathColor(color) ? color : "neutral",
    archived: value.archived === true,
    createdAt: str(value, "createdAt"),
    updatedAt: str(value, "updatedAt"),
    moduleCount: num(value, "moduleCount"),
    progress: parseProgress(value.progress),
  };
}

function parsePathDetail(value: unknown): LearningPathDetail {
  const path = parsePath(value);
  if (!path || !isRecord(value)) throw new Error("Could not load learning map");
  const modules = Array.isArray(value.modules)
    ? value.modules
        .map((module) => {
          if (
            !isRecord(module) ||
            typeof module.id !== "string" ||
            typeof module.title !== "string"
          )
            return null;
          const items = Array.isArray(module.items)
            ? module.items.map(parseItem).filter((item): item is LearningItem => item !== null)
            : [];
          return {
            id: module.id,
            pathId: str(module, "pathId", path.id),
            title: module.title,
            description: str(module, "description"),
            sortOrder: num(module, "sortOrder"),
            startDate: str(module, "startDate"),
            endDate: str(module, "endDate"),
            createdAt: str(module, "createdAt"),
            updatedAt: str(module, "updatedAt"),
            progress: parseProgress(module.progress),
            items,
          };
        })
        .filter((module): module is LearningPathDetail["modules"][number] => module !== null)
    : [];
  return { ...path, modules };
}

function parseJournal(value: unknown): LearningJournalEntry | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    pathId: typeof value.pathId === "string" ? value.pathId : null,
    title: str(value, "title"),
    body: str(value, "body"),
    entryDate: str(value, "entryDate"),
    createdAt: str(value, "createdAt"),
    updatedAt: str(value, "updatedAt"),
    pathTitle: typeof value.pathTitle === "string" ? value.pathTitle : undefined,
  };
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(parse).filter((item): item is T => item !== null);
}

export function fetchLearningOverview() {
  return api("/api/learning/overview", undefined, (value) => {
    if (!isRecord(value)) throw new Error("Could not load overview");
    return {
      paths: parseList(value.paths, parsePath),
      overdue: parseList(value.overdue, parseScheduleEntry),
      dueToday: parseList(value.dueToday, parseScheduleEntry),
      dueSoon: parseList(value.dueSoon, parseScheduleEntry),
      completedThisWeek: num(value, "completedThisWeek"),
      activeMinutesRemaining: num(value, "activeMinutesRemaining"),
      journalStreakDays: num(value, "journalStreakDays"),
    } satisfies LearningOverview;
  });
}

export function fetchLearningPaths(scope: ArchiveScope = "active") {
  return api(`/api/learning/paths?scope=${scope}`, undefined, (value) =>
    parseList(value, parsePath),
  );
}

export function fetchLearningPath(id: string) {
  return api(`/api/learning/paths/${id}`, undefined, parsePathDetail);
}

export function createLearningPathRequest(data: Record<string, unknown>) {
  return api(
    "/api/learning/paths",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
    parsePathDetail,
  );
}

export function patchLearningPathRequest(id: string, data: Record<string, unknown>) {
  return api(
    `/api/learning/paths/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    parsePathDetail,
  );
}

export function deleteLearningPathRequest(id: string) {
  return api(`/api/learning/paths/${id}`, { method: "DELETE" }, () => undefined);
}

export function createLearningModuleRequest(pathId: string, data: Record<string, unknown>) {
  return api(
    `/api/learning/paths/${pathId}/modules`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
    parsePathDetail,
  );
}

export function patchLearningModuleRequest(moduleId: string, data: Record<string, unknown>) {
  return api(
    `/api/learning/modules/${moduleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    parsePathDetail,
  );
}

export function deleteLearningModuleRequest(moduleId: string) {
  return api(`/api/learning/modules/${moduleId}`, { method: "DELETE" }, parsePathDetail);
}

export function createLearningItemRequest(moduleId: string, data: Record<string, unknown>) {
  return api(
    `/api/learning/modules/${moduleId}/items`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
    parsePathDetail,
  );
}

export function patchLearningItemRequest(itemId: string, data: Record<string, unknown>) {
  return api(
    `/api/learning/items/${itemId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    parsePathDetail,
  );
}

export function deleteLearningItemRequest(itemId: string) {
  return api(`/api/learning/items/${itemId}`, { method: "DELETE" }, parsePathDetail);
}

export function fetchDueLearningItems(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return api(`/api/learning/due${query ? `?${query}` : ""}`, undefined, (value) =>
    parseList(value, parseItem),
  );
}

function parseScheduleEntry(value: unknown): LearningScheduleEntry | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.pathId !== "string") {
    return null;
  }
  const kind = value.kind;
  if (kind !== "topic" && kind !== "module" && kind !== "map") return null;
  const itemKind = typeof value.itemKind === "string" ? value.itemKind : undefined;
  const itemStatus = typeof value.itemStatus === "string" ? value.itemStatus : undefined;
  return {
    id: value.id,
    kind,
    title: str(value, "title"),
    scheduleDate: str(value, "scheduleDate"),
    pathId: value.pathId,
    pathTitle: str(value, "pathTitle"),
    moduleId: typeof value.moduleId === "string" ? value.moduleId : undefined,
    moduleTitle: typeof value.moduleTitle === "string" ? value.moduleTitle : undefined,
    itemId: typeof value.itemId === "string" ? value.itemId : undefined,
    itemKind: itemKind && isLearningItemKind(itemKind) ? itemKind : undefined,
    itemStatus: itemStatus && isLearningItemStatus(itemStatus) ? itemStatus : undefined,
    estimatedMinutes:
      typeof value.estimatedMinutes === "number" ? value.estimatedMinutes : undefined,
  };
}

export function fetchLearningSchedule(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return api(`/api/learning/schedule${query ? `?${query}` : ""}`, undefined, (value) =>
    parseList(value, parseScheduleEntry),
  );
}

export function fetchLearningResources() {
  return api("/api/learning/resources", undefined, (value) => parseList(value, parseResource));
}

export function createLearningResourceRequest(data: LearningResourceCreate) {
  return api(
    "/api/learning/resources",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
    (value) => {
      const item = parseResource(value);
      if (!item) throw new Error("Could not save resource");
      return item;
    },
  );
}

export function patchLearningResourceRequest(id: string, patch: LearningResourcePatch) {
  return api(
    `/api/learning/resources/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
    (value) => {
      const item = parseResource(value);
      if (!item) throw new Error("Could not update resource");
      return item;
    },
  );
}

export function deleteLearningResourceRequest(id: string) {
  return api(`/api/learning/resources/${id}`, { method: "DELETE" }, () => undefined);
}

export function fetchLearningJournal() {
  return api("/api/learning/journal", undefined, (value) => parseList(value, parseJournal));
}

export function createLearningJournalRequest(data: Record<string, unknown>) {
  return api(
    "/api/learning/journal",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
    (value) => {
      const item = parseJournal(value);
      if (!item) throw new Error("Could not save journal entry");
      return item;
    },
  );
}

export function patchLearningJournalRequest(id: string, data: Record<string, unknown>) {
  return api(
    `/api/learning/journal/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    (value) => {
      const item = parseJournal(value);
      if (!item) throw new Error("Could not update journal entry");
      return item;
    },
  );
}

export function deleteLearningJournalRequest(id: string) {
  return api(`/api/learning/journal/${id}`, { method: "DELETE" }, () => undefined);
}
