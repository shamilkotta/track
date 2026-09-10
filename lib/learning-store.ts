import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  learningItems,
  learningJournalEntries,
  learningModules,
  learningPaths,
  learningResources,
} from "@/lib/db/schema";
import {
  isLearningItemKind,
  isLearningItemStatus,
  isLearningPathColor,
  isLearningPathStatus,
  learningProgressPercent,
  type ArchiveScope,
  type LearningItem,
  type LearningItemKind,
  type LearningItemStatus,
  type LearningJournalEntry,
  type LearningModule,
  type LearningOverview,
  type LearningPath,
  type LearningPathColor,
  type LearningPathDetail,
  type LearningPathStatus,
  type LearningResource,
  type LearningResourceCreate,
  type LearningResourcePatch,
  type LearningScheduleEntry,
} from "@/lib/domain";
import { HttpError, newId, now, requireString, stringField } from "@/lib/http";

type PathRow = typeof learningPaths.$inferSelect;
type ModuleRow = typeof learningModules.$inferSelect;
type ItemRow = typeof learningItems.$inferSelect;
type ResourceRow = typeof learningResources.$inferSelect;
type JournalRow = typeof learningJournalEntries.$inferSelect;

function iso(value: Date) {
  return value.toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function mapResource(
  row: ResourceRow,
  meta?: { pathTitle?: string; itemTitle?: string },
): LearningResource {
  return {
    id: row.id,
    pathId: row.pathId,
    itemId: row.itemId,
    title: row.title,
    sortOrder: row.sortOrder,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    pathTitle: meta?.pathTitle,
    itemTitle: meta?.itemTitle,
  };
}

function mapItem(
  row: ItemRow,
  resources: LearningResource[] = [],
  meta?: { pathTitle?: string; moduleTitle?: string },
): LearningItem {
  return {
    id: row.id,
    pathId: row.pathId,
    moduleId: row.moduleId,
    title: row.title,
    description: row.description,
    kind: isLearningItemKind(row.kind) ? row.kind : "lesson",
    status: isLearningItemStatus(row.status) ? row.status : "todo",
    dueDate: row.dueDate,
    estimatedMinutes: row.estimatedMinutes,
    sortOrder: row.sortOrder,
    notes: row.notes,
    completedAt: row.completedAt,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    resources,
    pathTitle: meta?.pathTitle,
    moduleTitle: meta?.moduleTitle,
  };
}

function mapModule(
  row: ModuleRow,
  items: LearningItem[] = [],
): LearningModule & { items?: LearningItem[] } {
  const doneItems = items.filter((item) => item.status === "done").length;
  const totalItems = items.length;
  return {
    id: row.id,
    pathId: row.pathId,
    title: row.title,
    description: row.description,
    sortOrder: row.sortOrder,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    progress: {
      totalItems,
      doneItems,
      percent: learningProgressPercent(doneItems, totalItems),
    },
    items,
  };
}

function mapPath(row: PathRow, items: ItemRow[] = [], moduleCount = 0): LearningPath {
  const totalItems = items.length;
  const doneItems = items.filter((item) => item.status === "done").length;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    goal: row.goal,
    status: isLearningPathStatus(row.status) ? row.status : "draft",
    startDate: row.startDate,
    targetEndDate: row.targetEndDate,
    color: isLearningPathColor(row.color) ? row.color : "neutral",
    archived: row.archived,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    moduleCount,
    progress: {
      totalItems,
      doneItems,
      percent: learningProgressPercent(doneItems, totalItems),
    },
  };
}

function mapJournal(row: JournalRow, pathTitle?: string): LearningJournalEntry {
  return {
    id: row.id,
    pathId: row.pathId,
    title: row.title,
    body: row.body,
    entryDate: row.entryDate,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    pathTitle,
  };
}

function intField(record: Record<string, unknown>, key: string, fallback = 0) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
  }
  return fallback;
}

function optionalId(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

async function ownedPath(userId: string, pathId: string) {
  const row = await db().query.learningPaths.findFirst({
    where: and(eq(learningPaths.id, pathId), eq(learningPaths.userId, userId)),
  });
  if (!row) throw new HttpError(404, "Learning map not found");
  return row;
}

async function ownedModule(userId: string, moduleId: string) {
  const row = await db().query.learningModules.findFirst({
    where: and(eq(learningModules.id, moduleId), eq(learningModules.userId, userId)),
  });
  if (!row) throw new HttpError(404, "Module not found");
  return row;
}

async function ownedItem(userId: string, itemId: string) {
  const row = await db().query.learningItems.findFirst({
    where: and(eq(learningItems.id, itemId), eq(learningItems.userId, userId)),
  });
  if (!row) throw new HttpError(404, "Item not found");
  return row;
}

function pathValues(record: Record<string, unknown>, current?: LearningPath) {
  const statusValue = stringField(record, "status", current?.status ?? "draft");
  const colorValue = stringField(record, "color", current?.color ?? "neutral");
  return {
    title: requireString(record, "title"),
    description: stringField(record, "description", current?.description ?? ""),
    goal: stringField(record, "goal", current?.goal ?? ""),
    status: (isLearningPathStatus(statusValue)
      ? statusValue
      : (current?.status ?? "draft")) as LearningPathStatus,
    startDate: stringField(record, "startDate", current?.startDate ?? ""),
    targetEndDate: stringField(record, "targetEndDate", current?.targetEndDate ?? ""),
    color: (isLearningPathColor(colorValue)
      ? colorValue
      : (current?.color ?? "neutral")) as LearningPathColor,
    archived: typeof record.archived === "boolean" ? record.archived : (current?.archived ?? false),
  };
}

export async function listLearningPaths(
  userId: string,
  scope: ArchiveScope = "active",
): Promise<LearningPath[]> {
  const database = db();
  const rows = await database.query.learningPaths.findMany({
    where:
      scope === "all"
        ? eq(learningPaths.userId, userId)
        : and(eq(learningPaths.userId, userId), eq(learningPaths.archived, scope === "archived")),
    orderBy: desc(learningPaths.updatedAt),
  });
  if (rows.length === 0) return [];
  const pathIds = rows.map((row) => row.id);
  const [items, modules] = await Promise.all([
    database.query.learningItems.findMany({
      where: and(eq(learningItems.userId, userId), inArray(learningItems.pathId, pathIds)),
      columns: { pathId: true, status: true },
    }),
    database.query.learningModules.findMany({
      where: and(eq(learningModules.userId, userId), inArray(learningModules.pathId, pathIds)),
      columns: { pathId: true },
    }),
  ]);
  const byPath = new Map<string, ItemRow[]>();
  for (const item of items as ItemRow[]) {
    const list = byPath.get(item.pathId) ?? [];
    list.push(item);
    byPath.set(item.pathId, list);
  }
  const moduleCountByPath = new Map<string, number>();
  for (const module of modules) {
    moduleCountByPath.set(module.pathId, (moduleCountByPath.get(module.pathId) ?? 0) + 1);
  }
  return rows.map((row) =>
    mapPath(row, byPath.get(row.id) ?? [], moduleCountByPath.get(row.id) ?? 0),
  );
}

export async function getLearningPath(userId: string, id: string): Promise<LearningPathDetail> {
  const path = await ownedPath(userId, id);
  const database = db();
  const [modules, items, resources] = await Promise.all([
    database.query.learningModules.findMany({
      where: and(eq(learningModules.pathId, id), eq(learningModules.userId, userId)),
      orderBy: [asc(learningModules.sortOrder), asc(learningModules.createdAt)],
    }),
    database.query.learningItems.findMany({
      where: and(eq(learningItems.pathId, id), eq(learningItems.userId, userId)),
      orderBy: [asc(learningItems.sortOrder), asc(learningItems.createdAt)],
    }),
    database.query.learningResources.findMany({
      where: and(
        eq(learningResources.pathId, id),
        eq(learningResources.userId, userId),
        isNotNull(learningResources.itemId),
      ),
      orderBy: [asc(learningResources.sortOrder), asc(learningResources.createdAt)],
    }),
  ]);

  const resourcesByItem = new Map<string, LearningResource[]>();
  for (const resource of resources) {
    if (!resource.itemId) continue;
    const list = resourcesByItem.get(resource.itemId) ?? [];
    list.push(mapResource(resource, { pathTitle: path.title }));
    resourcesByItem.set(resource.itemId, list);
  }

  const itemsByModule = new Map<string, LearningItem[]>();
  for (const item of items) {
    const mapped = mapItem(item, resourcesByItem.get(item.id) ?? [], {
      pathTitle: path.title,
      moduleTitle: modules.find((module) => module.id === item.moduleId)?.title,
    });
    const list = itemsByModule.get(item.moduleId) ?? [];
    list.push(mapped);
    itemsByModule.set(item.moduleId, list);
  }

  return {
    ...mapPath(path, items, modules.length),
    modules: modules.map((module) => ({
      ...mapModule(module, itemsByModule.get(module.id) ?? []),
      items: itemsByModule.get(module.id) ?? [],
    })),
  };
}

export async function createLearningPath(
  userId: string,
  record: Record<string, unknown>,
): Promise<LearningPathDetail> {
  const values = pathValues(record);
  const id = newId();
  const timestamp = now();
  await db()
    .insert(learningPaths)
    .values({ id, userId, ...values, createdAt: timestamp, updatedAt: timestamp });

  const firstModuleTitle = stringField(record, "firstModuleTitle", "Module 1");
  if (firstModuleTitle) {
    await db()
      .insert(learningModules)
      .values({
        id: newId(),
        pathId: id,
        userId,
        title: firstModuleTitle,
        description: "",
        sortOrder: 0,
        startDate: values.startDate || "",
        endDate: "",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
  }

  return getLearningPath(userId, id);
}

export async function updateLearningPath(
  userId: string,
  id: string,
  record: Record<string, unknown>,
): Promise<LearningPathDetail> {
  const current = mapPath(await ownedPath(userId, id));
  const values = pathValues({ ...record, title: record.title ?? current.title }, current);
  await db()
    .update(learningPaths)
    .set({ ...values, updatedAt: now() })
    .where(and(eq(learningPaths.id, id), eq(learningPaths.userId, userId)));
  return getLearningPath(userId, id);
}

export async function deleteLearningPath(userId: string, id: string) {
  await ownedPath(userId, id);
  await db()
    .delete(learningPaths)
    .where(and(eq(learningPaths.id, id), eq(learningPaths.userId, userId)));
}

export async function createLearningModule(
  userId: string,
  pathId: string,
  record: Record<string, unknown>,
): Promise<LearningPathDetail> {
  await ownedPath(userId, pathId);
  const existing = await db().query.learningModules.findMany({
    where: and(eq(learningModules.pathId, pathId), eq(learningModules.userId, userId)),
    columns: { sortOrder: true },
  });
  const maxOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1);
  const timestamp = now();
  await db()
    .insert(learningModules)
    .values({
      id: newId(),
      pathId,
      userId,
      title: requireString(record, "title"),
      description: stringField(record, "description"),
      sortOrder: intField(record, "sortOrder", maxOrder + 1),
      startDate: stringField(record, "startDate"),
      endDate: stringField(record, "endDate"),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  await db()
    .update(learningPaths)
    .set({ updatedAt: timestamp })
    .where(and(eq(learningPaths.id, pathId), eq(learningPaths.userId, userId)));
  return getLearningPath(userId, pathId);
}

export async function updateLearningModule(
  userId: string,
  moduleId: string,
  record: Record<string, unknown>,
): Promise<LearningPathDetail> {
  const current = await ownedModule(userId, moduleId);
  await db()
    .update(learningModules)
    .set({
      title: typeof record.title === "string" ? requireString(record, "title") : current.title,
      description: stringField(record, "description", current.description),
      sortOrder: intField(record, "sortOrder", current.sortOrder),
      startDate: stringField(record, "startDate", current.startDate),
      endDate: stringField(record, "endDate", current.endDate),
      updatedAt: now(),
    })
    .where(and(eq(learningModules.id, moduleId), eq(learningModules.userId, userId)));
  return getLearningPath(userId, current.pathId);
}

export async function deleteLearningModule(userId: string, moduleId: string) {
  const current = await ownedModule(userId, moduleId);
  await db()
    .delete(learningModules)
    .where(and(eq(learningModules.id, moduleId), eq(learningModules.userId, userId)));
  return getLearningPath(userId, current.pathId);
}

export async function createLearningItem(
  userId: string,
  moduleId: string,
  record: Record<string, unknown>,
): Promise<LearningPathDetail> {
  const module = await ownedModule(userId, moduleId);
  const existing = await db().query.learningItems.findMany({
    where: and(eq(learningItems.moduleId, moduleId), eq(learningItems.userId, userId)),
    columns: { sortOrder: true },
  });
  const maxOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1);
  const kindValue = stringField(record, "kind", "lesson");
  const statusValue = stringField(record, "status", "todo");
  const timestamp = now();
  const itemId = newId();
  const status = (isLearningItemStatus(statusValue) ? statusValue : "todo") as LearningItemStatus;
  await db()
    .insert(learningItems)
    .values({
      id: itemId,
      pathId: module.pathId,
      moduleId,
      userId,
      title: requireString(record, "title"),
      description: stringField(record, "description"),
      kind: (isLearningItemKind(kindValue) ? kindValue : "lesson") as LearningItemKind,
      status,
      dueDate: stringField(record, "dueDate"),
      estimatedMinutes: intField(record, "estimatedMinutes"),
      sortOrder: intField(record, "sortOrder", maxOrder + 1),
      notes: stringField(record, "notes"),
      completedAt: status === "done" ? todayIso() : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

  await db()
    .update(learningPaths)
    .set({ updatedAt: timestamp })
    .where(and(eq(learningPaths.id, module.pathId), eq(learningPaths.userId, userId)));
  return getLearningPath(userId, module.pathId);
}

export async function updateLearningItem(
  userId: string,
  itemId: string,
  record: Record<string, unknown>,
): Promise<LearningPathDetail> {
  const current = await ownedItem(userId, itemId);
  const kindValue = stringField(record, "kind", current.kind);
  const statusValue = stringField(record, "status", current.status);
  const status = (
    isLearningItemStatus(statusValue) ? statusValue : current.status
  ) as LearningItemStatus;
  const completedAt =
    status === "done"
      ? typeof record.completedAt === "string"
        ? record.completedAt
        : current.completedAt || todayIso()
      : null;
  await db()
    .update(learningItems)
    .set({
      title: typeof record.title === "string" ? requireString(record, "title") : current.title,
      description: stringField(record, "description", current.description),
      kind: (isLearningItemKind(kindValue) ? kindValue : current.kind) as LearningItemKind,
      status,
      dueDate: stringField(record, "dueDate", current.dueDate),
      estimatedMinutes: intField(record, "estimatedMinutes", current.estimatedMinutes),
      sortOrder: intField(record, "sortOrder", current.sortOrder),
      notes: stringField(record, "notes", current.notes),
      completedAt,
      updatedAt: now(),
    })
    .where(and(eq(learningItems.id, itemId), eq(learningItems.userId, userId)));
  return getLearningPath(userId, current.pathId);
}

export async function deleteLearningItem(userId: string, itemId: string) {
  const current = await ownedItem(userId, itemId);
  await db()
    .delete(learningItems)
    .where(and(eq(learningItems.id, itemId), eq(learningItems.userId, userId)));
  return getLearningPath(userId, current.pathId);
}

async function resourceMeta(
  userId: string,
  pathId: string | null,
  itemId: string | null,
): Promise<{ pathTitle?: string; itemTitle?: string }> {
  const [path, item] = await Promise.all([
    pathId
      ? db().query.learningPaths.findFirst({
          where: and(eq(learningPaths.id, pathId), eq(learningPaths.userId, userId)),
          columns: { title: true },
        })
      : Promise.resolve(undefined),
    itemId
      ? db().query.learningItems.findFirst({
          where: and(eq(learningItems.id, itemId), eq(learningItems.userId, userId)),
          columns: { title: true },
        })
      : Promise.resolve(undefined),
  ]);
  return {
    pathTitle: path?.title,
    itemTitle: item?.title,
  };
}

export async function createLearningResource(
  userId: string,
  input: LearningResourceCreate,
): Promise<LearningResource> {
  const title = input.title.trim();
  if (!title) throw new HttpError(400, "Title is required");

  const pathId = input.pathId?.trim() || null;
  const itemId = input.itemId?.trim() || null;
  if (pathId) await ownedPath(userId, pathId);
  if (itemId) {
    const item = await ownedItem(userId, itemId);
    if (pathId && item.pathId !== pathId) throw new HttpError(400, "Item does not belong to map");
  }
  const resolvedPathId = pathId ?? (itemId ? (await ownedItem(userId, itemId)).pathId : null);
  const timestamp = now();
  const id = newId();

  const siblings = itemId
    ? await db().query.learningResources.findMany({
        where: and(eq(learningResources.itemId, itemId), eq(learningResources.userId, userId)),
        orderBy: [asc(learningResources.sortOrder), asc(learningResources.createdAt)],
      })
    : resolvedPathId
      ? await db().query.learningResources.findMany({
          where: and(
            eq(learningResources.pathId, resolvedPathId),
            eq(learningResources.userId, userId),
            isNull(learningResources.itemId),
          ),
          orderBy: [asc(learningResources.sortOrder), asc(learningResources.createdAt)],
        })
      : await db().query.learningResources.findMany({
          where: and(
            eq(learningResources.userId, userId),
            isNull(learningResources.pathId),
            isNull(learningResources.itemId),
          ),
          orderBy: [asc(learningResources.sortOrder), asc(learningResources.createdAt)],
        });

  const afterResourceId = input.afterResourceId?.trim() || null;
  let insertAt = siblings.length;
  if (afterResourceId) {
    const afterIndex = siblings.findIndex((row) => row.id === afterResourceId);
    insertAt = afterIndex >= 0 ? afterIndex + 1 : siblings.length;
  }

  for (let index = 0; index < siblings.length; index += 1) {
    const nextOrder = index >= insertAt ? index + 1 : index;
    if (siblings[index].sortOrder === nextOrder) continue;
    await db()
      .update(learningResources)
      .set({ sortOrder: nextOrder, updatedAt: timestamp })
      .where(
        and(eq(learningResources.id, siblings[index].id), eq(learningResources.userId, userId)),
      );
  }

  const row = {
    id,
    userId,
    pathId: resolvedPathId,
    itemId,
    title,
    sortOrder: insertAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db().insert(learningResources).values(row);
  return mapResource(row, await resourceMeta(userId, resolvedPathId, itemId));
}

export async function updateLearningResource(
  userId: string,
  id: string,
  patch: LearningResourcePatch,
): Promise<LearningResource> {
  const current = await db().query.learningResources.findFirst({
    where: and(eq(learningResources.id, id), eq(learningResources.userId, userId)),
  });
  if (!current) throw new HttpError(404, "Resource not found");
  const title = patch.title.trim();
  if (!title) throw new HttpError(400, "Title is required");
  await db()
    .update(learningResources)
    .set({ title, updatedAt: now() })
    .where(and(eq(learningResources.id, id), eq(learningResources.userId, userId)));
  const stored = await db().query.learningResources.findFirst({
    where: and(eq(learningResources.id, id), eq(learningResources.userId, userId)),
  });
  if (!stored) throw new HttpError(404, "Resource not found");
  return mapResource(stored, await resourceMeta(userId, stored.pathId, stored.itemId));
}

export async function deleteLearningResource(userId: string, id: string) {
  const current = await db().query.learningResources.findFirst({
    where: and(eq(learningResources.id, id), eq(learningResources.userId, userId)),
  });
  if (!current) throw new HttpError(404, "Resource not found");
  await db()
    .delete(learningResources)
    .where(and(eq(learningResources.id, id), eq(learningResources.userId, userId)));
}

export async function listLearningResources(userId: string): Promise<LearningResource[]> {
  const database = db();
  const rows = await database.query.learningResources.findMany({
    where: eq(learningResources.userId, userId),
    orderBy: [asc(learningResources.createdAt)],
  });
  if (rows.length === 0) return [];

  const pathIds = [...new Set(rows.map((row) => row.pathId).filter(Boolean))] as string[];
  const itemIds = [...new Set(rows.map((row) => row.itemId).filter(Boolean))] as string[];

  const [paths, items] = await Promise.all([
    pathIds.length === 0
      ? Promise.resolve([])
      : database.query.learningPaths.findMany({
          where: and(eq(learningPaths.userId, userId), inArray(learningPaths.id, pathIds)),
          columns: { id: true, title: true },
        }),
    itemIds.length === 0
      ? Promise.resolve([])
      : database.query.learningItems.findMany({
          where: and(eq(learningItems.userId, userId), inArray(learningItems.id, itemIds)),
          columns: { id: true, title: true },
        }),
  ]);

  const pathTitles = new Map(paths.map((path) => [path.id, path.title]));
  const itemTitles = new Map(items.map((item) => [item.id, item.title]));

  return rows.map((row) =>
    mapResource(row, {
      pathTitle: row.pathId ? pathTitles.get(row.pathId) : undefined,
      itemTitle: row.itemId ? itemTitles.get(row.itemId) : undefined,
    }),
  );
}

export async function listLearningJournal(userId: string): Promise<LearningJournalEntry[]> {
  const database = db();
  const rows = await database.query.learningJournalEntries.findMany({
    where: eq(learningJournalEntries.userId, userId),
    orderBy: [desc(learningJournalEntries.entryDate), desc(learningJournalEntries.createdAt)],
  });
  if (rows.length === 0) return [];
  const pathIds = [...new Set(rows.map((row) => row.pathId).filter(Boolean))] as string[];
  const paths =
    pathIds.length === 0
      ? []
      : await database.query.learningPaths.findMany({
          where: and(eq(learningPaths.userId, userId), inArray(learningPaths.id, pathIds)),
          columns: { id: true, title: true },
        });
  const titles = new Map(paths.map((path) => [path.id, path.title]));
  return rows.map((row) => mapJournal(row, row.pathId ? titles.get(row.pathId) : undefined));
}

export async function createLearningJournalEntry(
  userId: string,
  record: Record<string, unknown>,
): Promise<LearningJournalEntry> {
  const pathId = optionalId(record, "pathId");
  if (pathId) await ownedPath(userId, pathId);
  const timestamp = now();
  const id = newId();
  const row = {
    id,
    userId,
    pathId,
    title: stringField(record, "title"),
    body: requireString(record, "body"),
    entryDate: stringField(record, "entryDate", todayIso()) || todayIso(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db().insert(learningJournalEntries).values(row);
  return mapJournal(row);
}

export async function updateLearningJournalEntry(
  userId: string,
  id: string,
  record: Record<string, unknown>,
): Promise<LearningJournalEntry> {
  const current = await db().query.learningJournalEntries.findFirst({
    where: and(eq(learningJournalEntries.id, id), eq(learningJournalEntries.userId, userId)),
  });
  if (!current) throw new HttpError(404, "Journal entry not found");
  const pathId = record.pathId === undefined ? current.pathId : optionalId(record, "pathId");
  if (pathId) await ownedPath(userId, pathId);
  await db()
    .update(learningJournalEntries)
    .set({
      pathId,
      title: stringField(record, "title", current.title),
      body: typeof record.body === "string" ? requireString(record, "body") : current.body,
      entryDate: stringField(record, "entryDate", current.entryDate) || current.entryDate,
      updatedAt: now(),
    })
    .where(and(eq(learningJournalEntries.id, id), eq(learningJournalEntries.userId, userId)));
  const stored = await db().query.learningJournalEntries.findFirst({
    where: and(eq(learningJournalEntries.id, id), eq(learningJournalEntries.userId, userId)),
  });
  if (!stored) throw new HttpError(404, "Journal entry not found");
  return mapJournal(stored);
}

export async function deleteLearningJournalEntry(userId: string, id: string) {
  const current = await db().query.learningJournalEntries.findFirst({
    where: and(eq(learningJournalEntries.id, id), eq(learningJournalEntries.userId, userId)),
  });
  if (!current) throw new HttpError(404, "Journal entry not found");
  await db()
    .delete(learningJournalEntries)
    .where(and(eq(learningJournalEntries.id, id), eq(learningJournalEntries.userId, userId)));
}

export async function listDueLearningItems(
  userId: string,
  options?: { from?: string; to?: string; includeOverdue?: boolean },
): Promise<LearningItem[]> {
  const from = options?.from ?? todayIso();
  const to = options?.to ?? addDaysIso(7);
  const database = db();
  const rows = await database.query.learningItems.findMany({
    where: and(
      eq(learningItems.userId, userId),
      ne(learningItems.status, "done"),
      ne(learningItems.status, "skipped"),
      isNotNull(learningItems.dueDate),
      ne(learningItems.dueDate, ""),
      options?.includeOverdue
        ? lte(learningItems.dueDate, to)
        : and(gte(learningItems.dueDate, from), lte(learningItems.dueDate, to)),
    ),
    orderBy: [asc(learningItems.dueDate), asc(learningItems.sortOrder)],
  });
  if (rows.length === 0) return [];
  const [paths, modules, resources] = await Promise.all([
    database.query.learningPaths.findMany({
      where: and(
        eq(learningPaths.userId, userId),
        inArray(learningPaths.id, [...new Set(rows.map((row) => row.pathId))]),
      ),
      columns: { id: true, title: true, archived: true },
    }),
    database.query.learningModules.findMany({
      where: and(
        eq(learningModules.userId, userId),
        inArray(learningModules.id, [...new Set(rows.map((row) => row.moduleId))]),
      ),
      columns: { id: true, title: true },
    }),
    database.query.learningResources.findMany({
      where: and(
        eq(learningResources.userId, userId),
        inArray(
          learningResources.itemId,
          rows.map((row) => row.id),
        ),
      ),
    }),
  ]);
  const pathMap = new Map(paths.filter((p) => !p.archived).map((p) => [p.id, p.title]));
  const moduleMap = new Map(modules.map((m) => [m.id, m.title]));
  const resourcesByItem = new Map<string, LearningResource[]>();
  for (const resource of resources) {
    if (!resource.itemId) continue;
    const list = resourcesByItem.get(resource.itemId) ?? [];
    list.push(mapResource(resource, { pathTitle: pathMap.get(resource.pathId ?? "") }));
    resourcesByItem.set(resource.itemId, list);
  }
  return rows
    .filter((row) => pathMap.has(row.pathId))
    .map((row) =>
      mapItem(row, resourcesByItem.get(row.id) ?? [], {
        pathTitle: pathMap.get(row.pathId),
        moduleTitle: moduleMap.get(row.moduleId),
      }),
    );
}

function scheduleDateInWindow(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function moduleScheduleDate(module: { startDate: string; endDate: string }) {
  return module.endDate || module.startDate || "";
}

function mapScheduleDate(path: { startDate: string; targetEndDate: string }) {
  return path.targetEndDate || path.startDate || "";
}

/** Topics with due dates win; otherwise modules; otherwise maps. */
export async function listLearningSchedule(
  userId: string,
  options?: { from?: string; to?: string },
): Promise<LearningScheduleEntry[]> {
  const from = options?.from ?? "0000-01-01";
  const to = options?.to ?? addDaysIso(7);
  const database = db();

  const paths = await database.query.learningPaths.findMany({
    where: and(eq(learningPaths.userId, userId), eq(learningPaths.archived, false)),
    columns: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      targetEndDate: true,
    },
  });
  if (paths.length === 0) return [];

  const pathIds = paths.map((path) => path.id);
  const [modules, items] = await Promise.all([
    database.query.learningModules.findMany({
      where: and(eq(learningModules.userId, userId), inArray(learningModules.pathId, pathIds)),
      columns: {
        id: true,
        pathId: true,
        title: true,
        startDate: true,
        endDate: true,
        sortOrder: true,
      },
      orderBy: [asc(learningModules.sortOrder), asc(learningModules.createdAt)],
    }),
    database.query.learningItems.findMany({
      where: and(
        eq(learningItems.userId, userId),
        inArray(learningItems.pathId, pathIds),
        ne(learningItems.status, "done"),
        ne(learningItems.status, "skipped"),
      ),
      orderBy: [asc(learningItems.sortOrder), asc(learningItems.createdAt)],
    }),
  ]);

  const modulesByPath = new Map<string, typeof modules>();
  for (const module of modules) {
    const list = modulesByPath.get(module.pathId) ?? [];
    list.push(module);
    modulesByPath.set(module.pathId, list);
  }

  const itemsByPath = new Map<string, ItemRow[]>();
  const itemsByModule = new Map<string, ItemRow[]>();
  for (const item of items) {
    const pathList = itemsByPath.get(item.pathId) ?? [];
    pathList.push(item);
    itemsByPath.set(item.pathId, pathList);
    const moduleList = itemsByModule.get(item.moduleId) ?? [];
    moduleList.push(item);
    itemsByModule.set(item.moduleId, moduleList);
  }

  const entries: LearningScheduleEntry[] = [];

  for (const path of paths) {
    if (path.status === "completed") continue;
    const pathItems = itemsByPath.get(path.id) ?? [];
    const pathModules = modulesByPath.get(path.id) ?? [];
    const pathTitle = path.title;

    for (const item of pathItems) {
      if (!item.dueDate) continue;
      if (!scheduleDateInWindow(item.dueDate, from, to)) continue;
      const module = pathModules.find((entry) => entry.id === item.moduleId);
      entries.push({
        id: `topic:${item.id}`,
        kind: "topic",
        title: item.title,
        scheduleDate: item.dueDate,
        pathId: path.id,
        pathTitle,
        moduleId: item.moduleId,
        moduleTitle: module?.title,
        itemId: item.id,
        itemKind: isLearningItemKind(item.kind) ? item.kind : "lesson",
        itemStatus: isLearningItemStatus(item.status) ? item.status : "todo",
        estimatedMinutes: item.estimatedMinutes,
      });
    }

    for (const module of pathModules) {
      const scheduleDate = moduleScheduleDate(module);
      if (!scheduleDate || !scheduleDateInWindow(scheduleDate, from, to)) continue;
      const moduleItems = itemsByModule.get(module.id) ?? [];
      if (moduleItems.some((item) => Boolean(item.dueDate))) continue;
      entries.push({
        id: `module:${module.id}`,
        kind: "module",
        title: module.title || "Untitled module",
        scheduleDate,
        pathId: path.id,
        pathTitle,
        moduleId: module.id,
        moduleTitle: module.title,
      });
    }

    const scheduleDate = mapScheduleDate(path);
    if (!scheduleDate || !scheduleDateInWindow(scheduleDate, from, to)) continue;
    if (pathItems.some((item) => Boolean(item.dueDate))) continue;
    if (pathModules.some((module) => Boolean(moduleScheduleDate(module)))) continue;
    entries.push({
      id: `map:${path.id}`,
      kind: "map",
      title: path.title,
      scheduleDate,
      pathId: path.id,
      pathTitle,
    });
  }

  return entries.sort((a, b) => {
    if (a.scheduleDate !== b.scheduleDate) return a.scheduleDate.localeCompare(b.scheduleDate);
    return a.title.localeCompare(b.title);
  });
}

function journalStreak(dates: string[]) {
  const unique = [...new Set(dates.filter(Boolean))].sort().reverse();
  if (unique.length === 0) return 0;
  let streak = 0;
  let cursor = todayIso();
  const set = new Set(unique);
  // Allow missing today — streak can continue from yesterday
  if (!set.has(cursor)) {
    cursor = addDaysIso(-1);
    if (!set.has(cursor)) return 0;
  }
  while (set.has(cursor)) {
    streak += 1;
    cursor = (() => {
      const d = new Date(`${cursor}T00:00:00`);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
  }
  return streak;
}

export async function loadLearningOverview(userId: string): Promise<LearningOverview> {
  const paths = await listLearningPaths(userId, "active");
  const today = todayIso();
  const weekEnd = addDaysIso(7);
  const weekStart = addDaysIso(-6);
  const [schedule, completedRows, openItems, journalRows] = await Promise.all([
    listLearningSchedule(userId, { from: "0000-01-01", to: weekEnd }),
    db().query.learningItems.findMany({
      where: and(
        eq(learningItems.userId, userId),
        eq(learningItems.status, "done"),
        isNotNull(learningItems.completedAt),
        gte(learningItems.completedAt, weekStart),
      ),
      columns: { id: true },
    }),
    db().query.learningItems.findMany({
      where: and(
        eq(learningItems.userId, userId),
        ne(learningItems.status, "done"),
        ne(learningItems.status, "skipped"),
      ),
      columns: { estimatedMinutes: true, pathId: true },
    }),
    db().query.learningJournalEntries.findMany({
      where: eq(learningJournalEntries.userId, userId),
      columns: { entryDate: true },
    }),
  ]);

  const activePathIds = new Set(
    paths.filter((p) => p.status === "active" || p.status === "draft").map((p) => p.id),
  );
  const activeMinutesRemaining = openItems
    .filter((item) => activePathIds.has(item.pathId))
    .reduce((sum, item) => sum + item.estimatedMinutes, 0);

  return {
    paths: paths.filter((path) => path.status !== "completed").slice(0, 5),
    overdue: schedule.filter((entry) => entry.scheduleDate < today).slice(0, 2),
    dueToday: schedule.filter((entry) => entry.scheduleDate === today).slice(0, 2),
    dueSoon: schedule.filter((entry) => entry.scheduleDate > today).slice(0, 2),
    completedThisWeek: completedRows.length,
    activeMinutesRemaining,
    journalStreakDays: journalStreak(journalRows.map((row) => row.entryDate)),
  };
}
