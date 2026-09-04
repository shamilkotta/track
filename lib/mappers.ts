import {
  isCurrency,
  isJobType,
  isLeadPlatform,
  isLeadStatus,
  isPriority,
  isRecord,
  isReminderTime,
  isReplyStatus,
  isSavedViewScreen,
  isSource,
  isStage,
  isStringArray,
  isWishlistStatus,
  isWorkMode,
  type Application,
  type ApplicationListItem,
  type Company,
  type CoverLetter,
  type CoverLetterListItem,
  type Lead,
  type LeadListItem,
  type Resume,
  type SavedView,
  type Wishlist,
  type WishlistContact,
  type WishlistListItem,
  type WorkspaceUser,
} from "@/lib/domain";
import type {
  account,
  applications,
  companies,
  coverLetters,
  leads,
  resumes,
  savedViews,
  session,
  user,
  verification,
  wishlists,
} from "@/lib/db/schema";

type UserRow = typeof user.$inferSelect;
type CompanyRow = typeof companies.$inferSelect;
type ResumeRow = typeof resumes.$inferSelect;
type CoverLetterRow = typeof coverLetters.$inferSelect;
type ApplicationRow = typeof applications.$inferSelect;
type LeadRow = typeof leads.$inferSelect;
type WishlistRow = typeof wishlists.$inferSelect;
type SavedViewRow = typeof savedViews.$inferSelect;

export type {
  UserRow,
  CompanyRow,
  ResumeRow,
  CoverLetterRow,
  ApplicationRow,
  LeadRow,
  WishlistRow,
  SavedViewRow,
};
export type SessionRow = typeof session.$inferSelect;
export type AccountRow = typeof account.$inferSelect;
export type VerificationRow = typeof verification.$inferSelect;

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return isStringArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseWishlistContacts(value: string): WishlistContact[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): WishlistContact | null => {
        if (!isRecord(item)) return null;
        return {
          id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
          name: typeof item.name === "string" ? item.name : "",
          role: typeof item.role === "string" ? item.role : "",
          email: typeof item.email === "string" ? item.email : "",
          phone: typeof item.phone === "string" ? item.phone : "",
          url: typeof item.url === "string" ? item.url : "",
          notes: typeof item.notes === "string" ? item.notes : "",
        };
      })
      .filter((item): item is WishlistContact => item !== null);
  } catch {
    return [];
  }
}

export function mapUser(row: UserRow): WorkspaceUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    title: row.title,
  };
}

export function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    logo: row.logo,
    color: row.color,
    location: row.location,
  };
}

export function mapResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    name: row.name,
    fileName: row.fileName,
  };
}

export function mapCoverLetter(row: CoverLetterRow): CoverLetter {
  if (row.kind === "file") {
    return {
      id: row.id,
      name: row.name,
      kind: "file",
      fileName: row.fileName ?? row.name,
    };
  }
  return {
    id: row.id,
    name: row.name,
    kind: "text",
    body: row.body ?? "",
  };
}

export function mapCoverLetterListItem(row: CoverLetterRow): CoverLetterListItem {
  if (row.kind === "file") {
    return {
      id: row.id,
      name: row.name,
      kind: "file",
      fileName: row.fileName ?? row.name,
    };
  }
  return {
    id: row.id,
    name: row.name,
    kind: "text",
  };
}

export function mapApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    companyId: row.companyId,
    role: row.role,
    source: isSource(row.source) ? row.source : "Other",
    companyWebsite: row.companyWebsite,
    jobType: isJobType(row.jobType) ? row.jobType : "Full-time",
    location: row.location,
    workMode: isWorkMode(row.workMode) ? row.workMode : "Remote",
    stage: isStage(row.stage) ? row.stage : "Applied",
    priority: isPriority(row.priority) ? row.priority : "Medium",
    replyStatus: isReplyStatus(row.replyStatus) ? row.replyStatus : "No reply yet",
    appliedDate: row.appliedDate,
    nextStepDate: row.nextStepDate,
    nextStepLabel: row.nextStepLabel,
    reminderTime: isReminderTime(row.reminderTime) ? row.reminderTime : "None",
    compensationMin: row.compensationMin,
    compensationMax: row.compensationMax,
    currency: isCurrency(row.currency) ? row.currency : "USD",
    equityBonus: row.equityBonus,
    jobUrl: row.jobUrl,
    jobDescription: row.jobDescription,
    resumeId: row.resumeId,
    coverLetterId: row.coverLetterId,
    message: row.message,
    notes: row.notes,
    contactName: row.contactName,
    contactRole: row.contactRole,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    contactUrl: row.contactUrl,
    contactNotes: row.contactNotes,
    tags: parseJsonArray(row.tags),
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapApplicationListItem(row: ApplicationRow): ApplicationListItem {
  const full = mapApplication(row);
  return {
    id: full.id,
    companyId: full.companyId,
    role: full.role,
    source: full.source,
    location: full.location,
    workMode: full.workMode,
    stage: full.stage,
    priority: full.priority,
    replyStatus: full.replyStatus,
    appliedDate: full.appliedDate,
    nextStepDate: full.nextStepDate,
    nextStepLabel: full.nextStepLabel,
    reminderTime: full.reminderTime,
    resumeId: full.resumeId,
    coverLetterId: full.coverLetterId,
    tags: full.tags,
    archived: full.archived,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
  };
}

export function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    companyId: row.companyId,
    personName: row.personName,
    personRole: row.personRole,
    platform: isLeadPlatform(row.platform) ? row.platform : "Other",
    companyWebsite: row.companyWebsite,
    profileUrl: row.profileUrl,
    leadUrl: row.leadUrl,
    status: isLeadStatus(row.status) ? row.status : "Draft",
    priority: isPriority(row.priority) ? row.priority : "Medium",
    sentDate: row.sentDate,
    nextStepDate: row.nextStepDate,
    nextStepLabel: row.nextStepLabel,
    reminderTime: isReminderTime(row.reminderTime) ? row.reminderTime : "None",
    message: row.message,
    resumeId: row.resumeId,
    coverLetterId: row.coverLetterId,
    notes: row.notes,
    tags: parseJsonArray(row.tags),
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapLeadListItem(row: LeadRow): LeadListItem {
  const full = mapLead(row);
  return {
    id: full.id,
    companyId: full.companyId,
    personName: full.personName,
    personRole: full.personRole,
    platform: full.platform,
    status: full.status,
    priority: full.priority,
    sentDate: full.sentDate,
    nextStepDate: full.nextStepDate,
    nextStepLabel: full.nextStepLabel,
    reminderTime: full.reminderTime,
    resumeId: full.resumeId,
    coverLetterId: full.coverLetterId,
    tags: full.tags,
    archived: full.archived,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
  };
}

export function mapWishlist(row: WishlistRow): Wishlist {
  return {
    id: row.id,
    companyId: row.companyId,
    companyWebsite: row.companyWebsite,
    interest: row.interest,
    status: isWishlistStatus(row.status) ? row.status : "Interested",
    priority: isPriority(row.priority) ? row.priority : "Medium",
    nextStepDate: row.nextStepDate,
    nextStepLabel: row.nextStepLabel,
    reminderTime: isReminderTime(row.reminderTime) ? row.reminderTime : "None",
    notes: row.notes,
    contacts: parseWishlistContacts(row.contacts),
    tags: parseJsonArray(row.tags),
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapWishlistListItem(row: WishlistRow): WishlistListItem {
  const full = mapWishlist(row);
  return {
    id: full.id,
    companyId: full.companyId,
    interest: full.interest,
    status: full.status,
    priority: full.priority,
    nextStepDate: full.nextStepDate,
    nextStepLabel: full.nextStepLabel,
    reminderTime: full.reminderTime,
    tags: full.tags,
    archived: full.archived,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
    contacts: full.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      role: contact.role,
    })),
  };
}

export function mapSavedView(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    name: row.name,
    screen: isSavedViewScreen(row.screen) ? row.screen : "applications",
    query: row.query,
    stage: row.stage || "All",
    sort: row.sort || "recent",
    priorities: parseJsonArray(row.priorities).filter(isPriority),
    replyStatuses: parseJsonArray(row.replyStatuses).filter(isReplyStatus),
    workModes: parseJsonArray(row.workModes).filter(isWorkMode),
    sources: parseJsonArray(row.sources),
    year: row.year || "all",
  };
}

export function tagsToJson(tags: string[]) {
  return JSON.stringify(tags);
}

export function contactsToJson(contacts: WishlistContact[]) {
  return JSON.stringify(contacts);
}

export function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function readPatchRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
