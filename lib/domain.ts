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

export type Screen = "applications" | "companies" | "resumes" | "cover-letters" | "archive";
export type Stage = (typeof stages)[number];
export type Priority = (typeof priorities)[number];
export type WorkMode = (typeof workModes)[number];
export type Source = (typeof sources)[number];
export type JobType = (typeof jobTypes)[number];
export type ReplyStatus = (typeof replyStatuses)[number];
export type Currency = (typeof currencies)[number];
export type ReminderTime = (typeof reminderTimes)[number];
export type SortKey = (typeof sortKeys)[number];
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
  compensationMin: string;
  compensationMax: string;
  currency: Currency;
  equityBonus: string;
  jobUrl: string;
  jobDescription: string;
  resumeId: string;
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
};

export type ApplicationFormValues = Omit<
  Application,
  "id" | "archived" | "createdAt" | "companyId" | "resumeId"
> & {
  companyId: string | null;
  resumeId: string | null;
};

export type SavedView = {
  id: string;
  name: string;
  query: string;
  stage: "All" | Stage;
  sort: SortKey;
  priorities: Priority[];
  replyStatuses: ReplyStatus[];
  workModes: WorkMode[];
  sources: Source[];
  year: string;
};

export type WorkspacePayload = {
  user: WorkspaceUser;
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  applications: Application[];
  savedViews: SavedView[];
};

export const screenTitles: Record<Screen, string> = {
  applications: "Applications",
  companies: "Companies",
  resumes: "Resumes",
  "cover-letters": "Cover letters",
  archive: "Archive",
};

export const sortLabels: Record<SortKey, string> = {
  recent: "Recent",
  company: "Company",
  stage: "Stage",
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

export function isScreen(value: unknown): value is Screen {
  return (
    value === "applications" ||
    value === "companies" ||
    value === "resumes" ||
    value === "cover-letters" ||
    value === "archive"
  );
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

export function nextStepSummary(item: Pick<Application, "nextStepLabel" | "nextStepDate">) {
  if (item.nextStepLabel) return item.nextStepLabel;
  if (item.nextStepDate) return formatDisplayDate(item.nextStepDate);
  return "—";
}

export function emptyFormValues(resumes: Resume[]): ApplicationFormValues {
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
    compensationMin: "",
    compensationMax: "",
    currency: "USD",
    equityBonus: "",
    jobUrl: "",
    jobDescription: "",
    resumeId: resumes[0]?.id ?? null,
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
  const { id: _id, archived: _archived, createdAt: _createdAt, ...rest } = item;
  return rest;
}

export function formValuesToApplicationPatch(
  draft: ApplicationFormValues,
): Omit<Application, "id" | "archived" | "createdAt"> | null {
  if (!draft.companyId || !draft.resumeId) return null;
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

export function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}
