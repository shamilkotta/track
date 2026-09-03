import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  companies,
  coverLetters,
  leads,
  resumes,
  savedViews,
  wishlists,
} from "@/lib/db/schema";
import {
  companyColorForIndex,
  companyInitial,
  isClosedLeadStatus,
  isClosedStage,
  isClosedWishlistStatus,
  isCurrency,
  isJobType,
  isLeadPlatform,
  isLeadStatus,
  isPriority,
  isReminderTime,
  isReplyStatus,
  isSavedViewScreen,
  isSource,
  isStage,
  isStringArray,
  isWishlistStatus,
  isWorkMode,
  type Application,
  type Company,
  type CoverLetter,
  type Lead,
  type Resume,
  type SavedView,
  type Wishlist,
  type WishlistContact,
  type WorkspacePayload,
} from "@/lib/domain";
import { deleteUserFile, putUserFile } from "@/lib/files";
import { HttpError, newId, now, requireString, stringField } from "@/lib/http";
import {
  contactsToJson,
  mapApplication,
  mapCompany,
  mapCoverLetter,
  mapLead,
  mapResume,
  mapSavedView,
  mapWishlist,
  parseIdList,
  tagsToJson,
} from "@/lib/mappers";
import type { Session } from "@/lib/auth";

type AuthUser = Session["user"];

async function ownedCompany(userId: string, companyId: string) {
  const row = await db().query.companies.findFirst({
    where: and(eq(companies.id, companyId), eq(companies.userId, userId)),
  });
  if (!row) throw new HttpError(400, "Company not found");
  return row;
}

async function ownedResume(userId: string, resumeId: string) {
  const row = await db().query.resumes.findFirst({
    where: and(eq(resumes.id, resumeId), eq(resumes.userId, userId)),
  });
  if (!row) throw new HttpError(400, "Resume not found");
  return row;
}

async function ownedCoverLetter(userId: string, coverLetterId: string) {
  const row = await db().query.coverLetters.findFirst({
    where: and(eq(coverLetters.id, coverLetterId), eq(coverLetters.userId, userId)),
  });
  if (!row) throw new HttpError(400, "Cover letter not found");
  return row;
}

export async function loadWorkspace(user: AuthUser): Promise<WorkspacePayload> {
  const database = db();
  const [companyRows, resumeRows, letterRows, applicationRows, leadRows, wishlistRows, viewRows] =
    await Promise.all([
      database.query.companies.findMany({
        where: eq(companies.userId, user.id),
        orderBy: desc(companies.createdAt),
      }),
      database.query.resumes.findMany({
        where: eq(resumes.userId, user.id),
        orderBy: desc(resumes.createdAt),
      }),
      database.query.coverLetters.findMany({
        where: eq(coverLetters.userId, user.id),
        orderBy: desc(coverLetters.createdAt),
      }),
      database.query.applications.findMany({
        where: eq(applications.userId, user.id),
        orderBy: desc(applications.createdAt),
      }),
      database.query.leads.findMany({
        where: eq(leads.userId, user.id),
        orderBy: desc(leads.createdAt),
      }),
      database.query.wishlists.findMany({
        where: eq(wishlists.userId, user.id),
        orderBy: desc(wishlists.createdAt),
      }),
      database.query.savedViews.findMany({
        where: eq(savedViews.userId, user.id),
        orderBy: desc(savedViews.createdAt),
      }),
    ]);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      title: typeof user.title === "string" ? user.title : "",
    },
    companies: companyRows.map(mapCompany),
    resumes: resumeRows.map(mapResume),
    coverLetters: letterRows.map(mapCoverLetter),
    applications: applicationRows.map(mapApplication),
    leads: leadRows.map(mapLead),
    wishlists: wishlistRows.map(mapWishlist),
    savedViews: viewRows.map(mapSavedView),
  };
}

export async function createCompany(
  userId: string,
  input: { name: string; website?: string; location?: string },
): Promise<Company> {
  const name = input.name.trim();
  if (!name) throw new HttpError(400, "Company name is required");
  const database = db();
  const existing = await database.query.companies.findMany({
    where: eq(companies.userId, userId),
  });
  const id = newId();
  const timestamp = now();
  const row = {
    id,
    userId,
    name,
    website: input.website?.trim() ?? "",
    logo: companyInitial(name),
    color: companyColorForIndex(existing.length),
    location: input.location?.trim() ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await database.insert(companies).values(row);
  return mapCompany(row);
}

export async function updateCompany(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Company> {
  const current = await ownedCompany(userId, id);
  const name =
    typeof patch.name === "string" && patch.name.trim() ? patch.name.trim() : current.name;
  const next = {
    name,
    website: typeof patch.website === "string" ? patch.website.trim() : current.website,
    location: typeof patch.location === "string" ? patch.location.trim() : current.location,
    logo:
      typeof patch.logo === "string" && patch.logo.trim()
        ? patch.logo.trim()
        : companyInitial(name),
    color:
      typeof patch.color === "string" && patch.color.trim() ? patch.color.trim() : current.color,
    updatedAt: now(),
  };
  await db()
    .update(companies)
    .set(next)
    .where(and(eq(companies.id, id), eq(companies.userId, userId)));
  return mapCompany({ ...current, ...next });
}

/** Fill empty company directory fields from application/lead form values. */
async function fillCompanyDirectoryFields(
  userId: string,
  companyId: string,
  fields: { website?: string; location?: string },
) {
  const company = await ownedCompany(userId, companyId);
  const website = fields.website?.trim() ?? "";
  const location = fields.location?.trim() ?? "";
  const next: { website?: string; location?: string; updatedAt: Date } = { updatedAt: now() };
  if (!company.website && website) next.website = website;
  if (!company.location && location) next.location = location;
  if (!next.website && !next.location) return;
  await db()
    .update(companies)
    .set(next)
    .where(and(eq(companies.id, companyId), eq(companies.userId, userId)));
}

export async function deleteCompany(userId: string, id: string) {
  const usedByApplication = await db().query.applications.findFirst({
    where: and(eq(applications.companyId, id), eq(applications.userId, userId)),
  });
  if (usedByApplication) throw new HttpError(409, "This company is used by an application");
  const usedByLead = await db().query.leads.findFirst({
    where: and(eq(leads.companyId, id), eq(leads.userId, userId)),
  });
  if (usedByLead) throw new HttpError(409, "This company is used by a lead");
  const usedByWishlist = await db().query.wishlists.findFirst({
    where: and(eq(wishlists.companyId, id), eq(wishlists.userId, userId)),
  });
  if (usedByWishlist) throw new HttpError(409, "This company is used by a wishlist item");
  await ownedCompany(userId, id);
  await db()
    .delete(companies)
    .where(and(eq(companies.id, id), eq(companies.userId, userId)));
}

export async function createResume(userId: string, file: File): Promise<Resume> {
  const id = newId();
  const stored = await putUserFile({
    userId,
    folder: "resumes",
    id,
    file,
    kinds: "resume",
  });
  const timestamp = now();
  const name = stored.fileName.replace(/\.[^.]+$/, "") || "Resume";
  const row = {
    id,
    userId,
    name,
    fileName: stored.fileName,
    objectKey: stored.objectKey,
    contentType: stored.contentType,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db().insert(resumes).values(row);
  return mapResume(row);
}

export async function updateResume(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Resume> {
  const current = await ownedResume(userId, id);
  const name =
    typeof patch.name === "string" && patch.name.trim() ? patch.name.trim() : current.name;
  const next = { name, updatedAt: now() };
  await db()
    .update(resumes)
    .set(next)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
  return mapResume({ ...current, ...next });
}

export async function deleteResume(userId: string, id: string) {
  const current = await ownedResume(userId, id);
  await db()
    .update(applications)
    .set({ resumeId: null, updatedAt: now() })
    .where(and(eq(applications.resumeId, id), eq(applications.userId, userId)));
  await db()
    .update(leads)
    .set({ resumeId: null, updatedAt: now() })
    .where(and(eq(leads.resumeId, id), eq(leads.userId, userId)));
  await db()
    .delete(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
  await deleteUserFile(current.objectKey);
}

export async function getResumeFile(userId: string, id: string) {
  return ownedResume(userId, id);
}

export async function createCoverLetter(
  userId: string,
  input: { name?: string; body?: string; file?: File },
): Promise<CoverLetter> {
  const id = newId();
  const timestamp = now();
  if (input.file) {
    const stored = await putUserFile({
      userId,
      folder: "cover-letters",
      id,
      file: input.file,
      kinds: "cover",
    });
    const name = input.name?.trim() || stored.fileName.replace(/\.[^.]+$/, "") || "Cover letter";
    const row = {
      id,
      userId,
      name,
      kind: "file" as const,
      body: null,
      fileName: stored.fileName,
      objectKey: stored.objectKey,
      contentType: stored.contentType,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db().insert(coverLetters).values(row);
    return mapCoverLetter(row);
  }
  const name = input.name?.trim();
  const body = input.body?.trim();
  if (!name || !body) throw new HttpError(400, "Name and text are required");
  const row = {
    id,
    userId,
    name,
    kind: "text" as const,
    body,
    fileName: null,
    objectKey: null,
    contentType: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db().insert(coverLetters).values(row);
  return mapCoverLetter(row);
}

export async function updateCoverLetter(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<CoverLetter> {
  const current = await ownedCoverLetter(userId, id);
  const name =
    typeof patch.name === "string" && patch.name.trim() ? patch.name.trim() : current.name;
  const body = typeof patch.body === "string" ? patch.body : current.body;
  const next = { name, body, updatedAt: now() };
  await db()
    .update(coverLetters)
    .set(next)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)));
  return mapCoverLetter({ ...current, ...next });
}

export async function deleteCoverLetter(userId: string, id: string) {
  const current = await ownedCoverLetter(userId, id);
  await db()
    .update(applications)
    .set({ coverLetterId: null, updatedAt: now() })
    .where(and(eq(applications.coverLetterId, id), eq(applications.userId, userId)));
  await db()
    .update(leads)
    .set({ coverLetterId: null, updatedAt: now() })
    .where(and(eq(leads.coverLetterId, id), eq(leads.userId, userId)));
  await db()
    .delete(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)));
  await deleteUserFile(current.objectKey);
}

export async function getCoverLetterFile(userId: string, id: string) {
  const current = await ownedCoverLetter(userId, id);
  if (current.kind !== "file" || !current.objectKey) {
    throw new HttpError(404, "This cover letter has no file");
  }
  return current;
}

function applicationValues(userId: string, record: Record<string, unknown>, current?: Application) {
  const companyId = stringField(record, "companyId", current?.companyId ?? "");
  const resumeId = nullableId(record.resumeId, current?.resumeId ?? null);
  const role = stringField(record, "role", current?.role ?? "");
  if (!companyId || !role.trim()) {
    throw new HttpError(400, "Company and role are required");
  }
  const stageRaw = stringField(record, "stage", current?.stage ?? "Applied");
  const stage = isStage(stageRaw) ? stageRaw : (current?.stage ?? "Applied");
  const archivedInput = record.archived;
  const archived =
    typeof archivedInput === "boolean"
      ? archivedInput
      : current
        ? current.archived
        : isClosedStage(stage);
  const tagsValue = record.tags;
  const tags = isStringArray(tagsValue)
    ? tagsValue
    : typeof tagsValue === "string"
      ? tagsValue
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : (current?.tags ?? []);
  const coverLetterIdRaw = record.coverLetterId;
  const coverLetterId =
    coverLetterIdRaw === null
      ? null
      : typeof coverLetterIdRaw === "string"
        ? coverLetterIdRaw
        : (current?.coverLetterId ?? null);

  return {
    companyId,
    role: role.trim(),
    source: isSource(stringField(record, "source", current?.source ?? "Company website"))
      ? stringField(record, "source", current?.source ?? "Company website")
      : (current?.source ?? "Company website"),
    companyWebsite: stringField(record, "companyWebsite", current?.companyWebsite ?? ""),
    jobType: isJobType(stringField(record, "jobType", current?.jobType ?? "Full-time"))
      ? stringField(record, "jobType", current?.jobType ?? "Full-time")
      : (current?.jobType ?? "Full-time"),
    location: stringField(record, "location", current?.location ?? ""),
    workMode: isWorkMode(stringField(record, "workMode", current?.workMode ?? "Remote"))
      ? stringField(record, "workMode", current?.workMode ?? "Remote")
      : (current?.workMode ?? "Remote"),
    stage,
    priority: isPriority(stringField(record, "priority", current?.priority ?? "Medium"))
      ? stringField(record, "priority", current?.priority ?? "Medium")
      : (current?.priority ?? "Medium"),
    replyStatus: isReplyStatus(
      stringField(record, "replyStatus", current?.replyStatus ?? "No reply yet"),
    )
      ? stringField(record, "replyStatus", current?.replyStatus ?? "No reply yet")
      : (current?.replyStatus ?? "No reply yet"),
    appliedDate: stringField(record, "appliedDate", current?.appliedDate ?? ""),
    nextStepDate: stringField(record, "nextStepDate", current?.nextStepDate ?? ""),
    nextStepLabel:
      stringField(record, "nextStepLabel", current?.nextStepLabel ?? "") || "Follow up",
    reminderTime: isReminderTime(
      stringField(record, "reminderTime", current?.reminderTime ?? "None"),
    )
      ? stringField(record, "reminderTime", current?.reminderTime ?? "None")
      : (current?.reminderTime ?? "None"),
    compensationMin: stringField(record, "compensationMin", current?.compensationMin ?? ""),
    compensationMax: stringField(record, "compensationMax", current?.compensationMax ?? ""),
    currency: isCurrency(stringField(record, "currency", current?.currency ?? "USD"))
      ? stringField(record, "currency", current?.currency ?? "USD")
      : (current?.currency ?? "USD"),
    equityBonus: stringField(record, "equityBonus", current?.equityBonus ?? ""),
    jobUrl: stringField(record, "jobUrl", current?.jobUrl ?? ""),
    jobDescription: stringField(record, "jobDescription", current?.jobDescription ?? ""),
    resumeId,
    coverLetterId,
    message: stringField(record, "message", current?.message ?? ""),
    notes: stringField(record, "notes", current?.notes ?? ""),
    contactName: stringField(record, "contactName", current?.contactName ?? ""),
    contactRole: stringField(record, "contactRole", current?.contactRole ?? ""),
    contactEmail: stringField(record, "contactEmail", current?.contactEmail ?? ""),
    contactPhone: stringField(record, "contactPhone", current?.contactPhone ?? ""),
    contactUrl: stringField(record, "contactUrl", current?.contactUrl ?? ""),
    contactNotes: stringField(record, "contactNotes", current?.contactNotes ?? ""),
    tags: tagsToJson(tags),
    archived: archived || isClosedStage(stage),
    userId,
  };
}

export async function createApplication(
  userId: string,
  record: Record<string, unknown>,
): Promise<Application> {
  const values = applicationValues(userId, record);
  await ownedCompany(userId, values.companyId);
  if (values.resumeId) await ownedResume(userId, values.resumeId);
  if (values.coverLetterId) await ownedCoverLetter(userId, values.coverLetterId);
  const id = newId();
  const timestamp = now();
  const row = { id, ...values, createdAt: timestamp, updatedAt: timestamp };
  await db().insert(applications).values(row);
  await fillCompanyDirectoryFields(userId, values.companyId, {
    website: values.companyWebsite,
    location: values.location,
  });
  const stored = await db().query.applications.findFirst({ where: eq(applications.id, id) });
  if (!stored) throw new HttpError(500, "Could not save application");
  return mapApplication(stored);
}

export async function updateApplication(
  userId: string,
  id: string,
  record: Record<string, unknown>,
): Promise<Application> {
  const currentRow = await db().query.applications.findFirst({
    where: and(eq(applications.id, id), eq(applications.userId, userId)),
  });
  if (!currentRow) throw new HttpError(404, "Application not found");
  const current = mapApplication(currentRow);
  const values = applicationValues(userId, record, current);
  await ownedCompany(userId, values.companyId);
  if (values.resumeId) await ownedResume(userId, values.resumeId);
  if (values.coverLetterId) await ownedCoverLetter(userId, values.coverLetterId);
  await db()
    .update(applications)
    .set({ ...values, updatedAt: now() })
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));
  await fillCompanyDirectoryFields(userId, values.companyId, {
    website: values.companyWebsite,
    location: values.location,
  });
  const stored = await db().query.applications.findFirst({
    where: and(eq(applications.id, id), eq(applications.userId, userId)),
  });
  if (!stored) throw new HttpError(404, "Application not found");
  return mapApplication(stored);
}

export async function deleteApplication(userId: string, id: string) {
  const current = await db().query.applications.findFirst({
    where: and(eq(applications.id, id), eq(applications.userId, userId)),
  });
  if (!current) throw new HttpError(404, "Application not found");
  await db()
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));
}

export async function bulkApplications(
  userId: string,
  ids: string[],
  action: "archive" | "unarchive" | "delete",
) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) throw new HttpError(400, "Select at least one application");
  const database = db();
  if (action === "delete") {
    await database
      .delete(applications)
      .where(and(eq(applications.userId, userId), inArray(applications.id, uniqueIds)));
    return { ok: true as const };
  }
  await database
    .update(applications)
    .set({ archived: action === "archive", updatedAt: now() })
    .where(and(eq(applications.userId, userId), inArray(applications.id, uniqueIds)));
  return { ok: true as const };
}

function nullableId(value: unknown, fallback: string | null) {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return fallback;
}

function leadValues(userId: string, record: Record<string, unknown>, current?: Lead) {
  const companyId = stringField(record, "companyId", current?.companyId ?? "");
  const personName = stringField(record, "personName", current?.personName ?? "");
  if (!companyId || !personName.trim()) {
    throw new HttpError(400, "Company and person name are required");
  }
  const statusRaw = stringField(record, "status", current?.status ?? "Draft");
  const status = isLeadStatus(statusRaw) ? statusRaw : (current?.status ?? "Draft");
  const archivedInput = record.archived;
  const archived =
    typeof archivedInput === "boolean"
      ? archivedInput
      : current
        ? current.archived
        : isClosedLeadStatus(status);
  const tagsValue = record.tags;
  const tags = isStringArray(tagsValue)
    ? tagsValue
    : typeof tagsValue === "string"
      ? tagsValue
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : (current?.tags ?? []);

  return {
    companyId,
    personName: personName.trim(),
    personRole: stringField(record, "personRole", current?.personRole ?? ""),
    platform: isLeadPlatform(stringField(record, "platform", current?.platform ?? "LinkedIn DM"))
      ? stringField(record, "platform", current?.platform ?? "LinkedIn DM")
      : (current?.platform ?? "LinkedIn DM"),
    companyWebsite: stringField(record, "companyWebsite", current?.companyWebsite ?? ""),
    profileUrl: stringField(record, "profileUrl", current?.profileUrl ?? ""),
    leadUrl: stringField(record, "leadUrl", current?.leadUrl ?? ""),
    status,
    priority: isPriority(stringField(record, "priority", current?.priority ?? "Medium"))
      ? stringField(record, "priority", current?.priority ?? "Medium")
      : (current?.priority ?? "Medium"),
    sentDate: stringField(record, "sentDate", current?.sentDate ?? ""),
    nextStepDate: stringField(record, "nextStepDate", current?.nextStepDate ?? ""),
    nextStepLabel:
      stringField(record, "nextStepLabel", current?.nextStepLabel ?? "") || "Follow up",
    reminderTime: isReminderTime(
      stringField(record, "reminderTime", current?.reminderTime ?? "None"),
    )
      ? stringField(record, "reminderTime", current?.reminderTime ?? "None")
      : (current?.reminderTime ?? "None"),
    message: stringField(record, "message", current?.message ?? ""),
    resumeId: nullableId(record.resumeId, current?.resumeId ?? null),
    coverLetterId: nullableId(record.coverLetterId, current?.coverLetterId ?? null),
    notes: stringField(record, "notes", current?.notes ?? ""),
    tags: tagsToJson(tags),
    archived: archived || isClosedLeadStatus(status),
    userId,
  };
}

export async function createLead(userId: string, record: Record<string, unknown>): Promise<Lead> {
  const values = leadValues(userId, record);
  await ownedCompany(userId, values.companyId);
  if (values.resumeId) await ownedResume(userId, values.resumeId);
  if (values.coverLetterId) await ownedCoverLetter(userId, values.coverLetterId);
  const id = newId();
  const timestamp = now();
  const row = { id, ...values, createdAt: timestamp, updatedAt: timestamp };
  await db().insert(leads).values(row);
  await fillCompanyDirectoryFields(userId, values.companyId, {
    website: values.companyWebsite,
  });
  const stored = await db().query.leads.findFirst({ where: eq(leads.id, id) });
  if (!stored) throw new HttpError(500, "Could not save lead");
  return mapLead(stored);
}

export async function updateLead(
  userId: string,
  id: string,
  record: Record<string, unknown>,
): Promise<Lead> {
  const currentRow = await db().query.leads.findFirst({
    where: and(eq(leads.id, id), eq(leads.userId, userId)),
  });
  if (!currentRow) throw new HttpError(404, "Lead not found");
  const current = mapLead(currentRow);
  const values = leadValues(userId, record, current);
  await ownedCompany(userId, values.companyId);
  if (values.resumeId) await ownedResume(userId, values.resumeId);
  if (values.coverLetterId) await ownedCoverLetter(userId, values.coverLetterId);
  await db()
    .update(leads)
    .set({ ...values, updatedAt: now() })
    .where(and(eq(leads.id, id), eq(leads.userId, userId)));
  await fillCompanyDirectoryFields(userId, values.companyId, {
    website: values.companyWebsite,
  });
  const stored = await db().query.leads.findFirst({
    where: and(eq(leads.id, id), eq(leads.userId, userId)),
  });
  if (!stored) throw new HttpError(404, "Lead not found");
  return mapLead(stored);
}

export async function deleteLead(userId: string, id: string) {
  const current = await db().query.leads.findFirst({
    where: and(eq(leads.id, id), eq(leads.userId, userId)),
  });
  if (!current) throw new HttpError(404, "Lead not found");
  await db()
    .delete(leads)
    .where(and(eq(leads.id, id), eq(leads.userId, userId)));
}

export async function bulkLeads(
  userId: string,
  ids: string[],
  action: "archive" | "unarchive" | "delete",
) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) throw new HttpError(400, "Select at least one lead");
  const database = db();
  if (action === "delete") {
    await database.delete(leads).where(and(eq(leads.userId, userId), inArray(leads.id, uniqueIds)));
    return { ok: true as const };
  }
  await database
    .update(leads)
    .set({ archived: action === "archive", updatedAt: now() })
    .where(and(eq(leads.userId, userId), inArray(leads.id, uniqueIds)));
  return { ok: true as const };
}

function parseWishlistContactsInput(
  value: unknown,
  fallback: WishlistContact[],
): WishlistContact[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item): WishlistContact | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      return {
        id: typeof record.id === "string" && record.id ? record.id : newId(),
        name: typeof record.name === "string" ? record.name.trim() : "",
        role: typeof record.role === "string" ? record.role.trim() : "",
        email: typeof record.email === "string" ? record.email.trim() : "",
        phone: typeof record.phone === "string" ? record.phone.trim() : "",
        url: typeof record.url === "string" ? record.url.trim() : "",
        notes: typeof record.notes === "string" ? record.notes : "",
      };
    })
    .filter((item): item is WishlistContact => item !== null)
    .filter(
      (contact) =>
        contact.name ||
        contact.role ||
        contact.email ||
        contact.phone ||
        contact.url ||
        contact.notes.trim(),
    );
}

function wishlistValues(userId: string, record: Record<string, unknown>, current?: Wishlist) {
  const companyId = stringField(record, "companyId", current?.companyId ?? "");
  if (!companyId) throw new HttpError(400, "Company is required");
  const statusRaw = stringField(record, "status", current?.status ?? "Interested");
  const status = isWishlistStatus(statusRaw) ? statusRaw : (current?.status ?? "Interested");
  const archivedInput = record.archived;
  const archived =
    typeof archivedInput === "boolean"
      ? archivedInput
      : current
        ? current.archived
        : isClosedWishlistStatus(status);
  const tagsValue = record.tags;
  const tags = isStringArray(tagsValue)
    ? tagsValue
    : typeof tagsValue === "string"
      ? tagsValue
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : (current?.tags ?? []);
  const contacts = parseWishlistContactsInput(record.contacts, current?.contacts ?? []);

  return {
    companyId,
    companyWebsite: stringField(record, "companyWebsite", current?.companyWebsite ?? ""),
    interest: stringField(record, "interest", current?.interest ?? ""),
    status,
    priority: isPriority(stringField(record, "priority", current?.priority ?? "Medium"))
      ? stringField(record, "priority", current?.priority ?? "Medium")
      : (current?.priority ?? "Medium"),
    nextStepDate: stringField(record, "nextStepDate", current?.nextStepDate ?? ""),
    nextStepLabel:
      stringField(record, "nextStepLabel", current?.nextStepLabel ?? "") || "Research company",
    reminderTime: isReminderTime(
      stringField(record, "reminderTime", current?.reminderTime ?? "None"),
    )
      ? stringField(record, "reminderTime", current?.reminderTime ?? "None")
      : (current?.reminderTime ?? "None"),
    notes: stringField(record, "notes", current?.notes ?? ""),
    contacts: contactsToJson(contacts),
    tags: tagsToJson(tags),
    archived: archived || isClosedWishlistStatus(status),
    userId,
  };
}

export async function createWishlist(
  userId: string,
  record: Record<string, unknown>,
): Promise<Wishlist> {
  const values = wishlistValues(userId, record);
  await ownedCompany(userId, values.companyId);
  const id = newId();
  const timestamp = now();
  const row = { id, ...values, createdAt: timestamp, updatedAt: timestamp };
  await db().insert(wishlists).values(row);
  await fillCompanyDirectoryFields(userId, values.companyId, {
    website: values.companyWebsite,
  });
  const stored = await db().query.wishlists.findFirst({ where: eq(wishlists.id, id) });
  if (!stored) throw new HttpError(500, "Could not save wishlist item");
  return mapWishlist(stored);
}

export async function updateWishlist(
  userId: string,
  id: string,
  record: Record<string, unknown>,
): Promise<Wishlist> {
  const currentRow = await db().query.wishlists.findFirst({
    where: and(eq(wishlists.id, id), eq(wishlists.userId, userId)),
  });
  if (!currentRow) throw new HttpError(404, "Wishlist item not found");
  const current = mapWishlist(currentRow);
  const values = wishlistValues(userId, record, current);
  await ownedCompany(userId, values.companyId);
  await db()
    .update(wishlists)
    .set({ ...values, updatedAt: now() })
    .where(and(eq(wishlists.id, id), eq(wishlists.userId, userId)));
  await fillCompanyDirectoryFields(userId, values.companyId, {
    website: values.companyWebsite,
  });
  const stored = await db().query.wishlists.findFirst({
    where: and(eq(wishlists.id, id), eq(wishlists.userId, userId)),
  });
  if (!stored) throw new HttpError(404, "Wishlist item not found");
  return mapWishlist(stored);
}

export async function deleteWishlist(userId: string, id: string) {
  const current = await db().query.wishlists.findFirst({
    where: and(eq(wishlists.id, id), eq(wishlists.userId, userId)),
  });
  if (!current) throw new HttpError(404, "Wishlist item not found");
  await db()
    .delete(wishlists)
    .where(and(eq(wishlists.id, id), eq(wishlists.userId, userId)));
}

export async function bulkWishlists(
  userId: string,
  ids: string[],
  action: "archive" | "unarchive" | "delete",
) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) throw new HttpError(400, "Select at least one wishlist item");
  const database = db();
  if (action === "delete") {
    await database
      .delete(wishlists)
      .where(and(eq(wishlists.userId, userId), inArray(wishlists.id, uniqueIds)));
    return { ok: true as const };
  }
  await database
    .update(wishlists)
    .set({ archived: action === "archive", updatedAt: now() })
    .where(and(eq(wishlists.userId, userId), inArray(wishlists.id, uniqueIds)));
  return { ok: true as const };
}

export async function createSavedView(
  userId: string,
  record: Record<string, unknown>,
): Promise<SavedView> {
  const name = requireString(record, "name");
  const id = newId();
  const timestamp = now();
  const screenValue = stringField(record, "screen", "applications");
  const row = {
    id,
    userId,
    name,
    query: stringField(record, "query"),
    stage: stringField(record, "stage", "All") || "All",
    sort: stringField(record, "sort", "recent") || "recent",
    priorities: JSON.stringify(parseIdList(record.priorities)),
    replyStatuses: JSON.stringify(parseIdList(record.replyStatuses)),
    workModes: JSON.stringify(parseIdList(record.workModes)),
    sources: JSON.stringify(parseIdList(record.sources)),
    year: stringField(record, "year", "all") || "all",
    screen: isSavedViewScreen(screenValue) ? screenValue : "applications",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db().insert(savedViews).values(row);
  return mapSavedView({
    ...row,
    priorities: row.priorities,
    replyStatuses: row.replyStatuses,
    workModes: row.workModes,
    sources: row.sources,
  });
}

export async function deleteSavedView(userId: string, id: string) {
  await db()
    .delete(savedViews)
    .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));
}
