export const stages = [
  "Wishlist",
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;
export const priorities = ["High", "Medium", "Low"] as const;
export const workModes = ["Remote", "Hybrid", "On-site", "Flexible"] as const;
export const sources = [
  "Company website",
  "LinkedIn",
  "Referral",
  "Recruiter",
  "Job board",
  "Networking",
  "Other",
] as const;
export const jobTypes = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"] as const;
export const replyStatuses = [
  "No reply yet",
  "Replied",
  "Follow-up needed",
  "Ghosted",
  "Rejected",
] as const;
export const currencies = ["USD", "EUR", "GBP", "CAD", "INR"] as const;
export const reminderTimes = ["None", "09:00 AM", "12:00 PM", "05:00 PM"] as const;
export const sortKeys = ["recent", "company", "stage", "priority"] as const;
export const companyColors = ["bg-foreground text-background", "bg-muted text-foreground"] as const;
export const closedStages = ["Rejected", "Withdrawn"] as const;
export const leadPlatforms = ["Twitter DM", "LinkedIn DM", "Cold email", "Email", "Other"] as const;
export const leadStatuses = [
  "Draft",
  "Sent",
  "Replied",
  "Follow-up",
  "Meeting booked",
  "Converted",
  "Closed",
] as const;
export const closedLeadStatuses = ["Closed"] as const;
export const leadSortKeys = ["recent", "company", "status", "priority"] as const;
export const wishlistStatuses = [
  "Interested",
  "Researching",
  "Ready",
  "Reached out",
  "Closed",
] as const;
export const closedWishlistStatuses = ["Closed"] as const;
export const wishlistSortKeys = ["recent", "company", "status", "priority"] as const;

export type Screen =
  | "applications"
  | "leads"
  | "wishlist"
  | "companies"
  | "resumes"
  | "cover-letters"
  | "archive"
  | "learning"
  | "learning-today"
  | "learning-paths"
  | "learning-journal"
  | "learning-resources";

export type ProductMode = "job" | "learning";

export const learningPathStatuses = ["draft", "active", "paused", "completed"] as const;
export const learningItemKinds = [
  "lesson",
  "practice",
  "project",
  "review",
  "reading",
  "video",
  "other",
] as const;
export const learningItemStatuses = ["todo", "in_progress", "done", "skipped"] as const;
export const learningResourceKinds = [
  "article",
  "video",
  "course",
  "book",
  "docs",
  "repo",
  "other",
] as const;
export const learningPathColors = ["neutral", "blue", "green", "amber", "rose", "violet"] as const;

export type LearningPathStatus = (typeof learningPathStatuses)[number];
export type LearningItemKind = (typeof learningItemKinds)[number];
export type LearningItemStatus = (typeof learningItemStatuses)[number];
export type LearningResourceKind = (typeof learningResourceKinds)[number];
export type LearningPathColor = (typeof learningPathColors)[number];

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  goal: string;
  status: LearningPathStatus;
  startDate: string;
  targetEndDate: string;
  color: LearningPathColor;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  progress: {
    totalItems: number;
    doneItems: number;
    percent: number;
  };
};

export type LearningModule = {
  id: string;
  pathId: string;
  title: string;
  description: string;
  sortOrder: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  progress: {
    totalItems: number;
    doneItems: number;
    percent: number;
  };
};

export type LearningResource = {
  id: string;
  pathId: string | null;
  itemId: string | null;
  title: string;
  url: string;
  kind: LearningResourceKind;
  notes: string;
  createdAt: string;
  updatedAt: string;
  pathTitle?: string;
};

export type LearningItem = {
  id: string;
  pathId: string;
  moduleId: string;
  title: string;
  description: string;
  kind: LearningItemKind;
  status: LearningItemStatus;
  dueDate: string;
  estimatedMinutes: number;
  sortOrder: number;
  notes: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resources: LearningResource[];
  pathTitle?: string;
  moduleTitle?: string;
};

export type LearningJournalEntry = {
  id: string;
  pathId: string | null;
  title: string;
  body: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  pathTitle?: string;
};

export type LearningPathDetail = LearningPath & {
  modules: Array<LearningModule & { items: LearningItem[] }>;
  resources: LearningResource[];
};

export type LearningOverview = {
  paths: LearningPath[];
  dueSoon: LearningItem[];
  overdue: LearningItem[];
  completedThisWeek: number;
  activeMinutesRemaining: number;
  journalStreakDays: number;
};
export type Stage = (typeof stages)[number];
export type Priority = (typeof priorities)[number];
export type WorkMode = (typeof workModes)[number];
export type Source = (typeof sources)[number];
export type JobType = (typeof jobTypes)[number];
export type ReplyStatus = (typeof replyStatuses)[number];
export type Currency = (typeof currencies)[number];
export type ReminderTime = (typeof reminderTimes)[number];
export type SortKey = (typeof sortKeys)[number];
export type LeadPlatform = (typeof leadPlatforms)[number];
export type LeadStatus = (typeof leadStatuses)[number];
export type LeadSortKey = (typeof leadSortKeys)[number];
export type WishlistStatus = (typeof wishlistStatuses)[number];
export type WishlistSortKey = (typeof wishlistSortKeys)[number];
export type CompanyColor = (typeof companyColors)[number];

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  title: string;
};

export type Company = {
  id: string;
  name: string;
  website: string;
  logo: string;
  color: string;
  location: string;
};

export type Resume = {
  id: string;
  name: string;
  fileName: string;
};

export type CoverLetter =
  | { id: string; name: string; kind: "text"; body: string }
  | { id: string; name: string; kind: "file"; fileName: string };

export type Application = {
  id: string;
  companyId: string;
  role: string;
  source: Source;
  companyWebsite: string;
  jobType: JobType;
  location: string;
  workMode: WorkMode;
  stage: Stage;
  priority: Priority;
  replyStatus: ReplyStatus;
  appliedDate: string;
  nextStepDate: string;
  nextStepLabel: string;
  reminderTime: ReminderTime;
  stepLogs: StepLog[];
  compensationMin: string;
  compensationMax: string;
  currency: Currency;
  equityBonus: string;
  jobUrl: string;
  jobDescription: string;
  resumeId: string | null;
  coverLetterId: string | null;
  message: string;
  notes: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
  contactUrl: string;
  contactNotes: string;
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationFormValues = Omit<
  Application,
  "id" | "archived" | "createdAt" | "updatedAt" | "companyId" | "resumeId"
> & {
  companyId: string | null;
  resumeId: string | null;
};

export type Lead = {
  id: string;
  companyId: string;
  personName: string;
  personRole: string;
  platform: LeadPlatform;
  companyWebsite: string;
  profileUrl: string;
  leadUrl: string;
  status: LeadStatus;
  priority: Priority;
  sentDate: string;
  nextStepDate: string;
  nextStepLabel: string;
  reminderTime: ReminderTime;
  stepLogs: StepLog[];
  message: string;
  resumeId: string | null;
  coverLetterId: string | null;
  notes: string;
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LeadFormValues = Omit<
  Lead,
  "id" | "archived" | "createdAt" | "updatedAt" | "companyId"
> & {
  companyId: string | null;
};

export type WishlistContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  url: string;
  notes: string;
};

export type StepLog = {
  id: string;
  completedAt: string;
  label: string;
  details: string;
  nextStepDate?: string;
  nextStepLabel?: string;
};

export type Wishlist = {
  id: string;
  companyId: string;
  companyWebsite: string;
  interest: string;
  status: WishlistStatus;
  priority: Priority;
  nextStepDate: string;
  nextStepLabel: string;
  reminderTime: ReminderTime;
  stepLogs: StepLog[];
  notes: string;
  contacts: WishlistContact[];
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WishlistFormValues = Omit<
  Wishlist,
  "id" | "archived" | "createdAt" | "updatedAt" | "companyId"
> & {
  companyId: string | null;
};

export const savedViewScreens = ["applications", "leads", "wishlist"] as const;
export type SavedViewScreen = (typeof savedViewScreens)[number];

export type SavedView = {
  id: string;
  name: string;
  screen: SavedViewScreen;
  query: string;
  stage: string;
  sort: string;
  priorities: Priority[];
  replyStatuses: ReplyStatus[];
  workModes: WorkMode[];
  sources: string[];
  year: string;
};

export type WorkspacePayload = {
  user: WorkspaceUser;
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  applications: Application[];
  leads: Lead[];
  wishlists: Wishlist[];
  savedViews: SavedView[];
};

/** List-row fields for applications (heavy detail fields omitted). */
export type ApplicationListItem = Pick<
  Application,
  | "id"
  | "companyId"
  | "role"
  | "source"
  | "location"
  | "workMode"
  | "stage"
  | "priority"
  | "replyStatus"
  | "appliedDate"
  | "nextStepDate"
  | "nextStepLabel"
  | "reminderTime"
  | "resumeId"
  | "coverLetterId"
  | "tags"
  | "archived"
  | "createdAt"
  | "updatedAt"
>;

/** List-row fields for leads. */
export type LeadListItem = Pick<
  Lead,
  | "id"
  | "companyId"
  | "personName"
  | "personRole"
  | "platform"
  | "status"
  | "priority"
  | "sentDate"
  | "nextStepDate"
  | "nextStepLabel"
  | "reminderTime"
  | "resumeId"
  | "coverLetterId"
  | "tags"
  | "archived"
  | "createdAt"
  | "updatedAt"
>;

/** Contact fields shown on wishlist list rows. */
export type WishlistContactSummary = Pick<WishlistContact, "id" | "name" | "role">;

/** List-row fields for wishlist (notes + full contact details omitted). */
export type WishlistListItem = Pick<
  Wishlist,
  | "id"
  | "companyId"
  | "interest"
  | "status"
  | "priority"
  | "nextStepDate"
  | "nextStepLabel"
  | "reminderTime"
  | "tags"
  | "archived"
  | "createdAt"
  | "updatedAt"
> & {
  contacts: WishlistContactSummary[];
};

/** Cover letter picker/list entry without text body. */
export type CoverLetterListItem =
  | { id: string; name: string; kind: "text" }
  | { id: string; name: string; kind: "file"; fileName: string };

export type ArchiveScope = "active" | "archived" | "all";

export type WorkspaceSearchHit = {
  id: string;
  title: string;
  subtitle: string;
  companyId: string;
  archived: boolean;
};

export type WorkspaceSummary = {
  user: WorkspaceUser;
  counts: {
    applications: number;
    leads: number;
    wishlists: number;
  };
  search: {
    applications: WorkspaceSearchHit[];
    leads: WorkspaceSearchHit[];
    wishlists: WorkspaceSearchHit[];
    companies: Array<{ id: string; name: string }>;
  };
};

export const screenTitles: Record<Screen, string> = {
  applications: "Applications",
  leads: "Leads",
  wishlist: "Wishlist",
  companies: "Companies",
  resumes: "Resumes",
  "cover-letters": "Cover letters",
  archive: "Archive",
  learning: "Overview",
  "learning-today": "Today",
  "learning-paths": "Paths",
  "learning-journal": "Journal",
  "learning-resources": "Resources",
};

export const sortLabels: Record<SortKey, string> = {
  recent: "Recent",
  company: "Company",
  stage: "Stage",
  priority: "Priority",
};

export const leadSortLabels: Record<LeadSortKey, string> = {
  recent: "Recent",
  company: "Company",
  status: "Status",
  priority: "Priority",
};

export const wishlistSortLabels: Record<WishlistSortKey, string> = {
  recent: "Recent",
  company: "Company",
  status: "Status",
  priority: "Priority",
};

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && stages.some((s) => s === value);
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && priorities.some((p) => p === value);
}

export function isWorkMode(value: unknown): value is WorkMode {
  return typeof value === "string" && workModes.some((m) => m === value);
}

export function isSource(value: unknown): value is Source {
  return typeof value === "string" && sources.some((s) => s === value);
}

export function isJobType(value: unknown): value is JobType {
  return typeof value === "string" && jobTypes.some((t) => t === value);
}

export function isReplyStatus(value: unknown): value is ReplyStatus {
  return typeof value === "string" && replyStatuses.some((s) => s === value);
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && currencies.some((c) => c === value);
}

export function isReminderTime(value: unknown): value is ReminderTime {
  return typeof value === "string" && reminderTimes.some((t) => t === value);
}

export function isSortKey(value: unknown): value is SortKey {
  return typeof value === "string" && sortKeys.some((s) => s === value);
}

export function isSavedViewScreen(value: unknown): value is SavedViewScreen {
  return typeof value === "string" && savedViewScreens.some((s) => s === value);
}

export function isLeadPlatform(value: unknown): value is LeadPlatform {
  return typeof value === "string" && leadPlatforms.some((p) => p === value);
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && leadStatuses.some((s) => s === value);
}

export function isLeadSortKey(value: unknown): value is LeadSortKey {
  return typeof value === "string" && leadSortKeys.some((s) => s === value);
}

export function isWishlistStatus(value: unknown): value is WishlistStatus {
  return typeof value === "string" && wishlistStatuses.some((s) => s === value);
}

export function isWishlistSortKey(value: unknown): value is WishlistSortKey {
  return typeof value === "string" && wishlistSortKeys.some((s) => s === value);
}

export function isScreen(value: unknown): value is Screen {
  return (
    value === "applications" ||
    value === "leads" ||
    value === "wishlist" ||
    value === "companies" ||
    value === "resumes" ||
    value === "cover-letters" ||
    value === "archive" ||
    value === "learning" ||
    value === "learning-today" ||
    value === "learning-paths" ||
    value === "learning-journal" ||
    value === "learning-resources"
  );
}

export function isLearningPathStatus(value: unknown): value is LearningPathStatus {
  return typeof value === "string" && learningPathStatuses.some((s) => s === value);
}

export function isLearningItemKind(value: unknown): value is LearningItemKind {
  return typeof value === "string" && learningItemKinds.some((k) => k === value);
}

export function isLearningItemStatus(value: unknown): value is LearningItemStatus {
  return typeof value === "string" && learningItemStatuses.some((s) => s === value);
}

export function isLearningResourceKind(value: unknown): value is LearningResourceKind {
  return typeof value === "string" && learningResourceKinds.some((k) => k === value);
}

export function isLearningPathColor(value: unknown): value is LearningPathColor {
  return typeof value === "string" && learningPathColors.some((c) => c === value);
}

export function productModeFromPathname(pathname: string): ProductMode {
  if (pathname === "/learning" || pathname.startsWith("/learning/")) return "learning";
  return "job";
}

const jobScreens = [
  "applications",
  "leads",
  "wishlist",
  "companies",
  "resumes",
  "cover-letters",
  "archive",
] as const;

export function screenPath(screen: Screen) {
  switch (screen) {
    case "learning":
      return "/learning";
    case "learning-today":
      return "/learning/today";
    case "learning-paths":
      return "/learning/paths";
    case "learning-journal":
      return "/learning/journal";
    case "learning-resources":
      return "/learning/resources";
    default:
      return `/job/${screen}`;
  }
}

export function screenFromPathname(pathname: string): Screen {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "learning") {
    if (!parts[1]) return "learning";
    if (parts[1] === "today") return "learning-today";
    if (parts[1] === "paths") return "learning-paths";
    if (parts[1] === "journal") return "learning-journal";
    if (parts[1] === "resources") return "learning-resources";
    return "learning";
  }
  if (parts[0] === "job") {
    const segment = parts[1];
    return segment && jobScreens.some((screen) => screen === segment)
      ? (segment as Screen)
      : "applications";
  }
  // Legacy root paths (/applications, etc.)
  const segment = parts[0];
  return segment && jobScreens.some((screen) => screen === segment)
    ? (segment as Screen)
    : "applications";
}

export function learningItemKindLabel(kind: LearningItemKind) {
  switch (kind) {
    case "lesson":
      return "Lesson";
    case "practice":
      return "Practice";
    case "project":
      return "Project";
    case "review":
      return "Review";
    case "reading":
      return "Reading";
    case "video":
      return "Video";
    default:
      return "Other";
  }
}

export function learningPathStatusLabel(status: LearningPathStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
  }
}

export function learningProgressPercent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

export function isClosedLeadStatus(value: LeadStatus): boolean {
  return closedLeadStatuses.some((s) => s === value);
}

export function isClosedWishlistStatus(value: WishlistStatus): boolean {
  return closedWishlistStatuses.some((s) => s === value);
}

export function isClosedStage(value: Stage): boolean {
  return closedStages.some((s) => s === value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function companyInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function companyColorForIndex(index: number): CompanyColor {
  const color = companyColors[index % companyColors.length];
  return color ?? "bg-muted text-foreground";
}

export function formatDisplayDate(iso: string) {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatCompensation(
  item: Pick<Application, "compensationMin" | "compensationMax" | "currency" | "equityBonus">,
) {
  const range = [item.compensationMin, item.compensationMax].filter(Boolean).join(" – ");
  if (!range) return item.equityBonus || "—";
  const base = `${item.currency} ${range}`;
  return item.equityBonus ? `${base} + ${item.equityBonus}` : base;
}

export type NextStepUrgency = "overdue" | "today" | "tomorrow" | "later" | "none";

export function todayIsoDate(now = new Date()) {
  const local = new Date(now);
  local.setHours(0, 0, 0, 0);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysUntilDate(iso: string, now = new Date()) {
  if (!iso) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

export function nextStepUrgency(iso: string, now = new Date()): NextStepUrgency {
  const diff = daysUntilDate(iso, now);
  if (diff === null) return "none";
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return "later";
}

export function formatRelativeNextStep(iso: string, now = new Date()) {
  const diff = daysUntilDate(iso, now);
  if (diff === null) return "—";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  return formatDisplayDate(iso);
}

export function nextStepSummary(
  item: Pick<Application | Lead | Wishlist, "nextStepLabel" | "nextStepDate">,
) {
  if (item.nextStepLabel && item.nextStepDate) {
    return `${item.nextStepLabel} · ${formatRelativeNextStep(item.nextStepDate)}`;
  }
  if (item.nextStepLabel) return item.nextStepLabel;
  if (item.nextStepDate) return formatRelativeNextStep(item.nextStepDate);
  return "—";
}

export function appendStepLog(
  stepLogs: StepLog[],
  entry: {
    label: string;
    details: string;
    completedAt?: string;
    nextStepDate?: string;
    nextStepLabel?: string;
  },
): StepLog[] {
  const completedAt = entry.completedAt ?? todayIsoDate();
  const label = entry.label.trim() || "Step";
  const details = entry.details.trim();
  const nextStepDate = entry.nextStepDate?.trim() ?? "";
  const nextStepLabel = entry.nextStepLabel?.trim() ?? "";
  const log: StepLog = {
    id: crypto.randomUUID(),
    completedAt,
    label,
    details,
    ...(nextStepDate ? { nextStepDate } : {}),
    ...(nextStepLabel ? { nextStepLabel } : {}),
  };
  return [log, ...stepLogs];
}

const legacyStepNotePattern = /^\[([^\]]+)\]\s+(.+?)\s+—\s+done(?:\n([\s\S]*))?$/;

export function parseStepLogsFromNotes(notes: string): StepLog[] {
  const blocks = notes.split(/\n\n+/);
  const logs: StepLog[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const match = trimmed.match(legacyStepNotePattern);
    if (!match) continue;
    const [, stamp, label, details = ""] = match;
    logs.push({
      id: crypto.randomUUID(),
      completedAt: stamp ?? todayIsoDate(),
      label: label.trim(),
      details: details.trim(),
    });
  }
  return logs.reverse();
}

export function resolveStepLogs(stepLogs: StepLog[], notes: string): StepLog[] {
  if (stepLogs.length > 0) return stepLogs;
  return parseStepLogsFromNotes(notes);
}

/** @deprecated Use appendStepLog instead */
export function appendFollowUpNote(
  notes: string,
  entry: { label: string; details: string; completedAt?: string },
) {
  const completedAt = entry.completedAt ?? todayIsoDate();
  const stamp = formatDisplayDate(completedAt);
  const label = entry.label.trim() || "Follow-up";
  const details = entry.details.trim();
  const block = details ? `[${stamp}] ${label} — done\n${details}` : `[${stamp}] ${label} — done`;
  const trimmed = notes.trim();
  return trimmed ? `${trimmed}\n\n${block}` : block;
}

export function pickMostUrgentNextStep<T extends { nextStepDate: string }>(items: T[]) {
  const dated = items.filter((item) => item.nextStepDate);
  if (dated.length === 0) return undefined;
  return [...dated].sort((a, b) => a.nextStepDate.localeCompare(b.nextStepDate))[0];
}

export function emptyFormValues(): ApplicationFormValues {
  return {
    companyId: null,
    role: "",
    source: "Company website",
    companyWebsite: "",
    jobType: "Full-time",
    location: "",
    workMode: "Remote",
    stage: "Applied",
    priority: "Medium",
    replyStatus: "No reply yet",
    appliedDate: new Date().toISOString().slice(0, 10),
    nextStepDate: "",
    nextStepLabel: "",
    reminderTime: "None",
    stepLogs: [],
    compensationMin: "",
    compensationMax: "",
    currency: "USD",
    equityBonus: "",
    jobUrl: "",
    jobDescription: "",
    resumeId: null,
    coverLetterId: null,
    message: "",
    notes: "",
    contactName: "",
    contactRole: "",
    contactEmail: "",
    contactPhone: "",
    contactUrl: "",
    contactNotes: "",
    tags: [],
  };
}

export function valuesFromApplication(item: Application): ApplicationFormValues {
  const {
    id: _id,
    archived: _archived,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = item;
  return rest;
}

export function formValuesToApplicationPatch(
  draft: ApplicationFormValues,
): Omit<Application, "id" | "archived" | "createdAt" | "updatedAt"> | null {
  if (!draft.companyId || !draft.role.trim()) return null;
  return {
    companyId: draft.companyId,
    role: draft.role.trim(),
    source: draft.source,
    companyWebsite: draft.companyWebsite.trim(),
    jobType: draft.jobType,
    location: draft.location.trim(),
    workMode: draft.workMode,
    stage: draft.stage,
    priority: draft.priority,
    replyStatus: draft.replyStatus,
    appliedDate: draft.appliedDate,
    nextStepDate: draft.nextStepDate,
    nextStepLabel: draft.nextStepLabel.trim(),
    reminderTime: draft.reminderTime,
    stepLogs: draft.stepLogs,
    compensationMin: draft.compensationMin.trim(),
    compensationMax: draft.compensationMax.trim(),
    currency: draft.currency,
    equityBonus: draft.equityBonus.trim(),
    jobUrl: draft.jobUrl.trim(),
    jobDescription: draft.jobDescription,
    resumeId: draft.resumeId,
    coverLetterId: draft.coverLetterId,
    message: draft.message,
    notes: draft.notes,
    contactName: draft.contactName.trim(),
    contactRole: draft.contactRole.trim(),
    contactEmail: draft.contactEmail.trim(),
    contactPhone: draft.contactPhone.trim(),
    contactUrl: draft.contactUrl.trim(),
    contactNotes: draft.contactNotes,
    tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
  };
}

export function emptyLeadFormValues(): LeadFormValues {
  return {
    companyId: null,
    personName: "",
    personRole: "",
    platform: "LinkedIn DM",
    companyWebsite: "",
    profileUrl: "",
    leadUrl: "",
    status: "Draft",
    priority: "Medium",
    sentDate: new Date().toISOString().slice(0, 10),
    nextStepDate: "",
    nextStepLabel: "",
    reminderTime: "None",
    stepLogs: [],
    message: "",
    resumeId: null,
    coverLetterId: null,
    notes: "",
    tags: [],
  };
}

export function valuesFromLead(item: Lead): LeadFormValues {
  const {
    id: _id,
    archived: _archived,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = item;
  return rest;
}

export function formValuesToLeadPatch(
  draft: LeadFormValues,
): Omit<Lead, "id" | "archived" | "createdAt" | "updatedAt"> | null {
  if (!draft.companyId || !draft.personName.trim()) return null;
  return {
    companyId: draft.companyId,
    personName: draft.personName.trim(),
    personRole: draft.personRole.trim(),
    platform: draft.platform,
    companyWebsite: draft.companyWebsite.trim(),
    profileUrl: draft.profileUrl.trim(),
    leadUrl: draft.leadUrl.trim(),
    status: draft.status,
    priority: draft.priority,
    sentDate: draft.sentDate,
    nextStepDate: draft.nextStepDate,
    nextStepLabel: draft.nextStepLabel.trim(),
    reminderTime: draft.reminderTime,
    stepLogs: draft.stepLogs,
    message: draft.message,
    resumeId: draft.resumeId,
    coverLetterId: draft.coverLetterId,
    notes: draft.notes,
    tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
  };
}

export function emptyWishlistContact(): WishlistContact {
  return {
    id: crypto.randomUUID(),
    name: "",
    role: "",
    email: "",
    phone: "",
    url: "",
    notes: "",
  };
}

export function emptyWishlistFormValues(): WishlistFormValues {
  return {
    companyId: null,
    companyWebsite: "",
    interest: "",
    status: "Interested",
    priority: "Medium",
    nextStepDate: "",
    nextStepLabel: "",
    reminderTime: "None",
    stepLogs: [],
    notes: "",
    contacts: [emptyWishlistContact()],
    tags: [],
  };
}

export function valuesFromWishlist(item: Wishlist): WishlistFormValues {
  const {
    id: _id,
    archived: _archived,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = item;
  return {
    ...rest,
    contacts: rest.contacts.length > 0 ? rest.contacts : [emptyWishlistContact()],
  };
}

export function formValuesToWishlistPatch(
  draft: WishlistFormValues,
): Omit<Wishlist, "id" | "archived" | "createdAt" | "updatedAt"> | null {
  if (!draft.companyId) return null;
  return {
    companyId: draft.companyId,
    companyWebsite: draft.companyWebsite.trim(),
    interest: draft.interest.trim(),
    status: draft.status,
    priority: draft.priority,
    nextStepDate: draft.nextStepDate,
    nextStepLabel: draft.nextStepLabel.trim(),
    reminderTime: draft.reminderTime,
    stepLogs: draft.stepLogs,
    notes: draft.notes,
    contacts: draft.contacts
      .map((contact) => ({
        id: contact.id || crypto.randomUUID(),
        name: contact.name.trim(),
        role: contact.role.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        url: contact.url.trim(),
        notes: contact.notes,
      }))
      .filter(
        (contact) =>
          contact.name ||
          contact.role ||
          contact.email ||
          contact.phone ||
          contact.url ||
          contact.notes.trim(),
      ),
    tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
  };
}

export function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export function parseTagsInput(raw: string) {
  return raw
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatTagsInput(tags: string[]) {
  return tags.join(", ");
}
