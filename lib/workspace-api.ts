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
  type ArchiveScope,
  type Company,
  type CoverLetter,
  type CoverLetterListItem,
  type Lead,
  type LeadListItem,
  type Resume,
  type SavedView,
  type SavedViewScreen,
  type Wishlist,
  type WishlistContact,
  type WishlistListItem,
  type WorkspaceSearchHit,
  type WorkspaceSummary,
  type WorkspaceUser,
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
  if (res.status === 401) {
    redirect("/sign-in");
  }
  if (!res.ok) throw new Error(await readError(res));
  return parse(await res.json());
}

function requiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function parseUser(value: unknown): WorkspaceUser {
  if (!isRecord(value)) throw new Error("Invalid user");
  return {
    id: requiredString(value, "id"),
    name: requiredString(value, "name"),
    email: requiredString(value, "email"),
    image: typeof value.image === "string" ? value.image : null,
    title: typeof value.title === "string" ? value.title : "",
  };
}

function parseCompany(value: unknown): Company | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string")
    return null;
  return {
    id: value.id,
    name: value.name,
    website: requiredString(value, "website"),
    logo: requiredString(value, "logo") || value.name.slice(0, 1).toUpperCase(),
    color: requiredString(value, "color") || "bg-muted text-foreground",
    location: requiredString(value, "location"),
  };
}

function parseResume(value: unknown): Resume | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string")
    return null;
  return {
    id: value.id,
    name: value.name,
    fileName: requiredString(value, "fileName") || value.name,
  };
}

function parseCoverLetter(value: unknown): CoverLetter | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string")
    return null;
  if (value.kind === "file") {
    return {
      id: value.id,
      name: value.name,
      kind: "file",
      fileName: requiredString(value, "fileName") || value.name,
    };
  }
  return {
    id: value.id,
    name: value.name,
    kind: "text",
    body: requiredString(value, "body"),
  };
}

function parseCoverLetterListItem(value: unknown): CoverLetterListItem | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string")
    return null;
  if (value.kind === "file") {
    return {
      id: value.id,
      name: value.name,
      kind: "file",
      fileName: requiredString(value, "fileName") || value.name,
    };
  }
  if (value.kind === "text") {
    return { id: value.id, name: value.name, kind: "text" };
  }
  return null;
}

function parseApplicationListItem(value: unknown): ApplicationListItem | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.companyId !== "string" || typeof value.role !== "string") return null;
  return {
    id: value.id,
    companyId: value.companyId,
    role: value.role,
    source: isSource(value.source) ? value.source : "Other",
    location: requiredString(value, "location"),
    workMode: isWorkMode(value.workMode) ? value.workMode : "Remote",
    stage: isStage(value.stage) ? value.stage : "Applied",
    priority: isPriority(value.priority) ? value.priority : "Medium",
    replyStatus: isReplyStatus(value.replyStatus) ? value.replyStatus : "No reply yet",
    appliedDate: requiredString(value, "appliedDate"),
    nextStepDate: requiredString(value, "nextStepDate"),
    nextStepLabel: requiredString(value, "nextStepLabel"),
    reminderTime: isReminderTime(value.reminderTime) ? value.reminderTime : "None",
    resumeId: typeof value.resumeId === "string" ? value.resumeId.trim() || null : null,
    coverLetterId: typeof value.coverLetterId === "string" ? value.coverLetterId : null,
    tags: isStringArray(value.tags) ? value.tags : [],
    archived: value.archived === true,
    createdAt: requiredString(value, "createdAt"),
    updatedAt: requiredString(value, "updatedAt"),
  };
}

function parseLeadListItem(value: unknown): LeadListItem | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.companyId !== "string" || typeof value.personName !== "string") return null;
  return {
    id: value.id,
    companyId: value.companyId,
    personName: value.personName,
    personRole: requiredString(value, "personRole"),
    platform: isLeadPlatform(value.platform) ? value.platform : "Other",
    status: isLeadStatus(value.status) ? value.status : "Draft",
    priority: isPriority(value.priority) ? value.priority : "Medium",
    sentDate: requiredString(value, "sentDate"),
    nextStepDate: requiredString(value, "nextStepDate"),
    nextStepLabel: requiredString(value, "nextStepLabel"),
    reminderTime: isReminderTime(value.reminderTime) ? value.reminderTime : "None",
    resumeId: typeof value.resumeId === "string" ? value.resumeId : null,
    coverLetterId: typeof value.coverLetterId === "string" ? value.coverLetterId : null,
    tags: isStringArray(value.tags) ? value.tags : [],
    archived: value.archived === true,
    createdAt: requiredString(value, "createdAt"),
    updatedAt: requiredString(value, "updatedAt"),
  };
}

function parseWishlistListItem(value: unknown): WishlistListItem | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.companyId !== "string") return null;
  return {
    id: value.id,
    companyId: value.companyId,
    interest: requiredString(value, "interest"),
    status: isWishlistStatus(value.status) ? value.status : "Interested",
    priority: isPriority(value.priority) ? value.priority : "Medium",
    nextStepDate: requiredString(value, "nextStepDate"),
    nextStepLabel: requiredString(value, "nextStepLabel"),
    reminderTime: isReminderTime(value.reminderTime) ? value.reminderTime : "None",
    tags: isStringArray(value.tags) ? value.tags : [],
    archived: value.archived === true,
    createdAt: requiredString(value, "createdAt"),
    updatedAt: requiredString(value, "updatedAt"),
    contacts: Array.isArray(value.contacts)
      ? value.contacts
          .map((item) => {
            if (!isRecord(item)) return null;
            return {
              id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
              name: requiredString(item, "name"),
              role: requiredString(item, "role"),
            };
          })
          .filter((item): item is NonNullable<typeof item> => !!item)
      : [],
  };
}

function parseSearchHit(value: unknown): WorkspaceSearchHit | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    title: requiredString(value, "title"),
    subtitle: requiredString(value, "subtitle"),
    companyId: requiredString(value, "companyId"),
    archived: value.archived === true,
  };
}

function parseWorkspaceSummary(value: unknown): WorkspaceSummary {
  if (!isRecord(value)) throw new Error("Invalid workspace summary");
  const counts = isRecord(value.counts) ? value.counts : {};
  const search = isRecord(value.search) ? value.search : {};
  return {
    user: parseUser(value.user),
    counts: {
      applications: typeof counts.applications === "number" ? counts.applications : 0,
      leads: typeof counts.leads === "number" ? counts.leads : 0,
      wishlists: typeof counts.wishlists === "number" ? counts.wishlists : 0,
    },
    search: {
      applications: parseList(search.applications, parseSearchHit),
      leads: parseList(search.leads, parseSearchHit),
      wishlists: parseList(search.wishlists, parseSearchHit),
      companies: Array.isArray(search.companies)
        ? search.companies
            .map((item) => {
              if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string") {
                return null;
              }
              return { id: item.id, name: item.name };
            })
            .filter((item): item is { id: string; name: string } => !!item)
        : [],
    },
  };
}

function parseApplication(value: unknown): Application | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.companyId !== "string") return null;
  if (typeof value.role !== "string") return null;
  const resumeId = typeof value.resumeId === "string" ? value.resumeId.trim() : null;

  return {
    id: value.id,
    companyId: value.companyId,
    role: value.role,
    source: isSource(value.source) ? value.source : "Other",
    companyWebsite: requiredString(value, "companyWebsite"),
    jobType: isJobType(value.jobType) ? value.jobType : "Full-time",
    location: requiredString(value, "location"),
    workMode: isWorkMode(value.workMode) ? value.workMode : "Remote",
    stage: isStage(value.stage) ? value.stage : "Applied",
    priority: isPriority(value.priority) ? value.priority : "Medium",
    replyStatus: isReplyStatus(value.replyStatus) ? value.replyStatus : "No reply yet",
    appliedDate: requiredString(value, "appliedDate"),
    nextStepDate: requiredString(value, "nextStepDate"),
    nextStepLabel: requiredString(value, "nextStepLabel"),
    reminderTime: isReminderTime(value.reminderTime) ? value.reminderTime : "None",
    compensationMin: requiredString(value, "compensationMin"),
    compensationMax: requiredString(value, "compensationMax"),
    currency: isCurrency(value.currency) ? value.currency : "USD",
    equityBonus: requiredString(value, "equityBonus"),
    jobUrl: requiredString(value, "jobUrl"),
    jobDescription: requiredString(value, "jobDescription"),
    resumeId,
    coverLetterId: typeof value.coverLetterId === "string" ? value.coverLetterId : null,
    message: requiredString(value, "message"),
    notes: requiredString(value, "notes"),
    contactName: requiredString(value, "contactName"),
    contactRole: requiredString(value, "contactRole"),
    contactEmail: requiredString(value, "contactEmail"),
    contactPhone: requiredString(value, "contactPhone"),
    contactUrl: requiredString(value, "contactUrl"),
    contactNotes: requiredString(value, "contactNotes"),
    tags: isStringArray(value.tags) ? value.tags : [],
    archived: value.archived === true,
    createdAt: requiredString(value, "createdAt"),
    updatedAt: requiredString(value, "updatedAt"),
  };
}

function parseLead(value: unknown): Lead | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.companyId !== "string" || typeof value.personName !== "string") return null;
  return {
    id: value.id,
    companyId: value.companyId,
    personName: value.personName,
    personRole: requiredString(value, "personRole"),
    platform: isLeadPlatform(value.platform) ? value.platform : "Other",
    companyWebsite: requiredString(value, "companyWebsite"),
    profileUrl: requiredString(value, "profileUrl"),
    leadUrl: requiredString(value, "leadUrl"),
    status: isLeadStatus(value.status) ? value.status : "Draft",
    priority: isPriority(value.priority) ? value.priority : "Medium",
    sentDate: requiredString(value, "sentDate"),
    nextStepDate: requiredString(value, "nextStepDate"),
    nextStepLabel: requiredString(value, "nextStepLabel"),
    reminderTime: isReminderTime(value.reminderTime) ? value.reminderTime : "None",
    message: requiredString(value, "message"),
    resumeId: typeof value.resumeId === "string" ? value.resumeId : null,
    coverLetterId: typeof value.coverLetterId === "string" ? value.coverLetterId : null,
    notes: requiredString(value, "notes"),
    tags: isStringArray(value.tags) ? value.tags : [],
    archived: value.archived === true,
    createdAt: requiredString(value, "createdAt"),
    updatedAt: requiredString(value, "updatedAt"),
  };
}

function parseWishlistContact(value: unknown): WishlistContact | null {
  if (!isRecord(value)) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : crypto.randomUUID(),
    name: requiredString(value, "name"),
    role: requiredString(value, "role"),
    email: requiredString(value, "email"),
    phone: requiredString(value, "phone"),
    url: requiredString(value, "url"),
    notes: requiredString(value, "notes"),
  };
}

function parseWishlist(value: unknown): Wishlist | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.companyId !== "string") return null;
  return {
    id: value.id,
    companyId: value.companyId,
    companyWebsite: requiredString(value, "companyWebsite"),
    interest: requiredString(value, "interest"),
    status: isWishlistStatus(value.status) ? value.status : "Interested",
    priority: isPriority(value.priority) ? value.priority : "Medium",
    nextStepDate: requiredString(value, "nextStepDate"),
    nextStepLabel: requiredString(value, "nextStepLabel"),
    reminderTime: isReminderTime(value.reminderTime) ? value.reminderTime : "None",
    notes: requiredString(value, "notes"),
    contacts: Array.isArray(value.contacts)
      ? value.contacts.map(parseWishlistContact).filter((item): item is WishlistContact => !!item)
      : [],
    tags: isStringArray(value.tags) ? value.tags : [],
    archived: value.archived === true,
    createdAt: requiredString(value, "createdAt"),
    updatedAt: requiredString(value, "updatedAt"),
  };
}

function parseSavedView(value: unknown): SavedView | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string")
    return null;
  return {
    id: value.id,
    name: value.name,
    screen: isSavedViewScreen(value.screen) ? value.screen : "applications",
    query: requiredString(value, "query"),
    stage: requiredString(value, "stage") || "All",
    sort: requiredString(value, "sort") || "recent",
    priorities: isStringArray(value.priorities) ? value.priorities.filter(isPriority) : [],
    replyStatuses: isStringArray(value.replyStatuses)
      ? value.replyStatuses.filter(isReplyStatus)
      : [],
    workModes: isStringArray(value.workModes) ? value.workModes.filter(isWorkMode) : [],
    sources: isStringArray(value.sources) ? value.sources : [],
    year: requiredString(value, "year") || "all",
  };
}

function parseList<T>(value: unknown, parseItem: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseItem).filter((item): item is T => item !== null);
}

export function parseWorkspace(value: unknown): WorkspaceSummary {
  return parseWorkspaceSummary(value);
}

export function fetchWorkspaceSummary() {
  return api("/api/workspace", undefined, parseWorkspaceSummary);
}

export function fetchApplications(scope: ArchiveScope = "active") {
  return api(`/api/applications?scope=${scope}`, undefined, (value) =>
    parseList(value, parseApplicationListItem),
  );
}

export function fetchApplication(id: string) {
  return api(`/api/applications/${id}`, undefined, (value) => {
    const application = parseApplication(value);
    if (!application) throw new Error("Could not load application");
    return application;
  });
}

export function fetchLeads(scope: ArchiveScope = "active") {
  return api(`/api/leads?scope=${scope}`, undefined, (value) =>
    parseList(value, parseLeadListItem),
  );
}

export function fetchLead(id: string) {
  return api(`/api/leads/${id}`, undefined, (value) => {
    const lead = parseLead(value);
    if (!lead) throw new Error("Could not load lead");
    return lead;
  });
}

export function fetchWishlists(scope: ArchiveScope = "active") {
  return api(`/api/wishlists?scope=${scope}`, undefined, (value) =>
    parseList(value, parseWishlistListItem),
  );
}

export function fetchWishlist(id: string) {
  return api(`/api/wishlists/${id}`, undefined, (value) => {
    const item = parseWishlist(value);
    if (!item) throw new Error("Could not load wishlist item");
    return item;
  });
}

export function fetchCompanies() {
  return api("/api/companies", undefined, (value) => parseList(value, parseCompany));
}

export function fetchResumes() {
  return api("/api/resumes", undefined, (value) => parseList(value, parseResume));
}

export function fetchCoverLetters() {
  return api("/api/cover-letters", undefined, (value) =>
    parseList(value, parseCoverLetterListItem),
  );
}

export function fetchCoverLetter(id: string) {
  return api(`/api/cover-letters/${id}`, undefined, (value) => {
    const letter = parseCoverLetter(value);
    if (!letter) throw new Error("Could not load cover letter");
    return letter;
  });
}

export function fetchSavedViews(screen?: SavedViewScreen) {
  const url = screen ? `/api/views?screen=${screen}` : "/api/views";
  return api(url, undefined, (value) => parseList(value, parseSavedView));
}

/** @deprecated Use fetchWorkspaceSummary */
export function fetchWorkspace() {
  return fetchWorkspaceSummary();
}

export function createCompanyRequest(
  name: string,
  extra?: { website?: string; location?: string },
) {
  return api(
    "/api/companies",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, ...extra }),
    },
    (value) => {
      const company = parseCompany(value);
      if (!company) throw new Error("Could not create company");
      return company;
    },
  );
}

export function patchCompanyRequest(id: string, patch: Record<string, unknown>) {
  return api(
    `/api/companies/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
    (value) => {
      const company = parseCompany(value);
      if (!company) throw new Error("Could not update company");
      return company;
    },
  );
}

export function deleteCompanyRequest(id: string) {
  return api(`/api/companies/${id}`, { method: "DELETE" }, () => undefined);
}

export function uploadResumeRequest(file: File) {
  const body = new FormData();
  body.append("file", file);
  return api("/api/resumes", { method: "POST", body }, (value) => {
    const resume = parseResume(value);
    if (!resume) throw new Error("Could not upload resume");
    return resume;
  });
}

export function patchResumeRequest(id: string, patch: Record<string, unknown>) {
  return api(
    `/api/resumes/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
    (value) => {
      const resume = parseResume(value);
      if (!resume) throw new Error("Could not update resume");
      return resume;
    },
  );
}

export function deleteResumeRequest(id: string) {
  return api(`/api/resumes/${id}`, { method: "DELETE" }, () => undefined);
}

export function createCoverTextRequest(name: string, body: string) {
  return api(
    "/api/cover-letters",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, body }),
    },
    (value) => {
      const letter = parseCoverLetter(value);
      if (!letter) throw new Error("Could not save cover letter");
      return letter;
    },
  );
}

export function uploadCoverRequest(file: File) {
  const body = new FormData();
  body.append("file", file);
  return api("/api/cover-letters", { method: "POST", body }, (value) => {
    const letter = parseCoverLetter(value);
    if (!letter) throw new Error("Could not upload cover letter");
    return letter;
  });
}

export function patchCoverRequest(id: string, patch: Record<string, unknown>) {
  return api(
    `/api/cover-letters/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
    (value) => {
      const letter = parseCoverLetter(value);
      if (!letter) throw new Error("Could not update cover letter");
      return letter;
    },
  );
}

export function deleteCoverRequest(id: string) {
  return api(`/api/cover-letters/${id}`, { method: "DELETE" }, () => undefined);
}

export function createApplicationRequest(data: Record<string, unknown>) {
  return api(
    "/api/applications",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    },
    (value) => {
      const application = parseApplication(value);
      if (!application) throw new Error("Could not save application");
      return application;
    },
  );
}

export function patchApplicationRequest(id: string, patch: Record<string, unknown>) {
  return api(
    `/api/applications/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
    (value) => {
      const application = parseApplication(value);
      if (!application) throw new Error("Could not update application");
      return application;
    },
  );
}

export function deleteApplicationRequest(id: string) {
  return api(`/api/applications/${id}`, { method: "DELETE" }, () => undefined);
}

export function bulkApplicationsRequest(ids: string[], action: "archive" | "unarchive" | "delete") {
  return api(
    "/api/applications",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, action }),
    },
    () => undefined,
  );
}

export function createLeadRequest(data: Record<string, unknown>) {
  return api(
    "/api/leads",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    },
    (value) => {
      const lead = parseLead(value);
      if (!lead) throw new Error("Could not save lead");
      return lead;
    },
  );
}

export function patchLeadRequest(id: string, patch: Record<string, unknown>) {
  return api(
    `/api/leads/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
    (value) => {
      const lead = parseLead(value);
      if (!lead) throw new Error("Could not update lead");
      return lead;
    },
  );
}

export function deleteLeadRequest(id: string) {
  return api(`/api/leads/${id}`, { method: "DELETE" }, () => undefined);
}

export function bulkLeadsRequest(ids: string[], action: "archive" | "unarchive" | "delete") {
  return api(
    "/api/leads",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, action }),
    },
    () => undefined,
  );
}

export function createWishlistRequest(data: Record<string, unknown>) {
  return api(
    "/api/wishlists",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    },
    (value) => {
      const item = parseWishlist(value);
      if (!item) throw new Error("Could not save wishlist item");
      return item;
    },
  );
}

export function patchWishlistRequest(id: string, patch: Record<string, unknown>) {
  return api(
    `/api/wishlists/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
    (value) => {
      const item = parseWishlist(value);
      if (!item) throw new Error("Could not update wishlist item");
      return item;
    },
  );
}

export function deleteWishlistRequest(id: string) {
  return api(`/api/wishlists/${id}`, { method: "DELETE" }, () => undefined);
}

export function bulkWishlistsRequest(ids: string[], action: "archive" | "unarchive" | "delete") {
  return api(
    "/api/wishlists",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, action }),
    },
    () => undefined,
  );
}

export function createViewRequest(view: Omit<SavedView, "id">) {
  return api(
    "/api/views",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(view),
    },
    (value) => {
      const saved = parseSavedView(value);
      if (!saved) throw new Error("Could not save view");
      return saved;
    },
  );
}

export function deleteViewRequest(id: string) {
  return api(`/api/views/${id}`, { method: "DELETE" }, () => undefined);
}
