// Shared types and rules for the clients tab. Imported by the worker and the browser,
// so nothing here touches env, the database or secrets.

export const clientLeadStatuses = [
  "new",
  "draft_ready",
  "approved",
  "waiting",
  "replied",
  "in_talks",
  "won",
  "cold",
  "dropped",
] as const;
export type ClientLeadStatus = (typeof clientLeadStatuses)[number];

// The lifecycle from the spec. Anything not listed is an illegal transition (409).
// "sent" and "log_reply" moves are applied by their own handlers, but they still
// have to be legal here.
export const clientTransitions: Record<ClientLeadStatus, readonly ClientLeadStatus[]> = {
  new: ["draft_ready", "dropped"],
  draft_ready: ["approved", "dropped"],
  approved: ["waiting", "dropped"],
  waiting: ["replied", "cold", "dropped"],
  replied: ["in_talks", "dropped"],
  in_talks: ["won", "dropped"],
  won: [],
  cold: ["new", "replied"],
  dropped: [],
};

export function canTransition(from: ClientLeadStatus, to: ClientLeadStatus) {
  return from === to || clientTransitions[from].includes(to);
}

export const clientCategories = ["founder_app", "pro_site", "local_shop", "shopify"] as const;
export type ClientCategory = (typeof clientCategories)[number];

export const clientContactChannels = ["email", "x", "reddit", "other"] as const;
export type ClientContactChannel = (typeof clientContactChannels)[number];

export const clientEmailConfidences = ["high", "med", "low"] as const;
export type ClientEmailConfidence = (typeof clientEmailConfidences)[number];

export const clientDraftKinds = ["first", "followup", "reply"] as const;
export type ClientDraftKind = (typeof clientDraftKinds)[number];

export const clientDraftAuthors = ["agent", "shamil"] as const;
export type ClientDraftAuthor = (typeof clientDraftAuthors)[number];

export const clientDraftStatuses = [
  "pending",
  "revision_requested",
  "approved",
  "superseded",
  "sent",
  "rejected",
] as const;
export type ClientDraftStatus = (typeof clientDraftStatuses)[number];

export const clientPaymentStatuses = ["unpaid", "part_paid", "paid"] as const;
export type ClientPaymentStatus = (typeof clientPaymentStatuses)[number];

export const clientDeliveryStatuses = ["in_progress", "delivered"] as const;
export type ClientDeliveryStatus = (typeof clientDeliveryStatuses)[number];

export const clientDropReasons = [
  "weak_hook",
  "said_no",
  "wrong_fit",
  "cant_reach",
  "other",
] as const;
export type ClientDropReason = (typeof clientDropReasons)[number];

export const clientEventActions = ["approve", "revise", "drop", "revive", "hold", "note"] as const;
export type ClientEventAction = (typeof clientEventActions)[number];

export const clientMessageDirections = ["in", "out"] as const;
export type ClientMessageDirection = (typeof clientMessageDirections)[number];

export const clientNoteAuthors = ["agent", "shamil"] as const;
export type ClientNoteAuthor = (typeof clientNoteAuthors)[number];

export const clientViews = ["inbox", "waiting", "replies", "active", "archive"] as const;
export type ClientView = (typeof clientViews)[number];

function oneOf<T extends string>(values: readonly T[]) {
  return (value: unknown): value is T =>
    typeof value === "string" && values.some((candidate) => candidate === value);
}

export const isClientLeadStatus = oneOf(clientLeadStatuses);
export const isClientCategory = oneOf(clientCategories);
export const isClientContactChannel = oneOf(clientContactChannels);
export const isClientEmailConfidence = oneOf(clientEmailConfidences);
export const isClientDraftKind = oneOf(clientDraftKinds);
export const isClientDraftStatus = oneOf(clientDraftStatuses);
export const isClientDraftAuthor = oneOf(clientDraftAuthors);
export const isClientPaymentStatus = oneOf(clientPaymentStatuses);
export const isClientDeliveryStatus = oneOf(clientDeliveryStatuses);
export const isClientDropReason = oneOf(clientDropReasons);
export const isClientEventAction = oneOf(clientEventActions);
export const isClientView = oneOf(clientViews);

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

export const dropReasonLabels: Record<ClientDropReason, string> = {
  weak_hook: "weak hook",
  said_no: "said no",
  wrong_fit: "wrong fit",
  cant_reach: "can't reach",
  other: "other",
};

export const categoryLabels: Record<ClientCategory, string> = {
  founder_app: "founder app",
  pro_site: "pro site",
  local_shop: "local shop",
  shopify: "shopify",
};

export const statusLabels: Record<ClientLeadStatus, string> = {
  new: "new",
  draft_ready: "draft ready",
  approved: "approved",
  waiting: "waiting",
  replied: "replied",
  in_talks: "in talks",
  won: "won",
  cold: "cold",
  dropped: "dropped",
};

// Wire shapes for /api/clients (browser) responses. Money is in major units here;
// the database stores minor units.
export type ClientDraft = {
  id: string;
  leadId: string;
  kind: ClientDraftKind;
  version: number;
  subject: string;
  body: string;
  bodySha256: string;
  author: ClientDraftAuthor;
  status: ClientDraftStatus;
  approvedAt: string | null;
  createdAt: string;
};

export type ClientMessage = {
  id: string;
  leadId: string;
  direction: ClientMessageDirection;
  body: string;
  summary: string;
  receivedAt: string;
};

export type ClientTask = {
  id: string;
  leadId: string;
  text: string;
  done: boolean;
  blocked: boolean;
  position: number;
};

export type ClientNote = {
  id: string;
  leadId: string;
  author: ClientNoteAuthor;
  body: string;
  createdAt: string;
};

export type ClientEvent = {
  id: string;
  leadId: string;
  action: ClientEventAction;
  payload: Record<string, unknown>;
  createdAt: string;
  deliveredAt: string | null;
  attempts: number;
  lastError: string | null;
};

export type ClientLead = {
  id: string;
  externalRef: string;
  business: string;
  contactName: string;
  region: string;
  category: ClientCategory | null;
  siteUrl: string;
  hookUrl: string;
  need: string;
  contactEmail: string;
  contactChannel: ClientContactChannel;
  emailConfidence: ClientEmailConfidence | null;
  sourceUrl: string;
  status: ClientLeadStatus;
  onHold: boolean;
  doNotContact: boolean;
  dropReason: ClientDropReason | null;
  dropNote: string;
  firstSentAt: string | null;
  followupSentAt: string | null;
  followupDueAt: string | null;
  coldDueAt: string | null;
  coldAt: string | null;
  budgetStated: number | null;
  quotedPrice: number | null;
  agreedPrice: number | null;
  currency: string;
  paymentStatus: ClientPaymentStatus | null;
  deliveryStatus: ClientDeliveryStatus | null;
  previewUrl: string;
  startedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientLeadDetail = ClientLead & {
  drafts: ClientDraft[];
  messages: ClientMessage[];
  tasks: ClientTask[];
  notes: ClientNote[];
  undeliveredEvents: ClientEvent[];
};

export type ClientStats = {
  sent7d: number;
  replyRate: number | null;
  firstSent30d: number;
  inTalks: number;
  won: number;
  earned: Array<{ currency: string; amount: number }>;
};

export type ClientBoard = {
  leads: ClientLeadDetail[];
  stats: ClientStats;
  generatedAt: string;
};

// Pure helpers the browser uses to slice the board into views. Kept here so the
// counts in the segmented control and the view bodies can never disagree.

export function pendingDraft(lead: ClientLeadDetail, kinds: readonly ClientDraftKind[]) {
  return (
    lead.drafts
      .filter((draft) => kinds.includes(draft.kind) && draft.status === "pending")
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}

export function latestDraft(lead: ClientLeadDetail, kinds: readonly ClientDraftKind[]) {
  return (
    lead.drafts
      .filter((draft) => kinds.includes(draft.kind))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.version - a.version)[0] ?? null
  );
}

export type InboxItem = {
  lead: ClientLeadDetail;
  draft: ClientDraft | null;
  needsAction: boolean;
};

export function inboxItems(leads: ClientLeadDetail[]): InboxItem[] {
  const items: InboxItem[] = [];
  for (const lead of leads) {
    if (lead.doNotContact) continue;
    if (lead.status === "draft_ready") {
      const draft = latestDraft(lead, ["first"]);
      const live =
        draft && (draft.status === "pending" || draft.status === "revision_requested")
          ? draft
          : null;
      items.push({ lead, draft: live, needsAction: !live || live.status === "pending" });
    } else if (lead.status === "waiting") {
      const draft = latestDraft(lead, ["followup"]);
      if (draft && (draft.status === "pending" || draft.status === "revision_requested")) {
        items.push({ lead, draft, needsAction: draft.status === "pending" });
      }
    }
  }
  return items.sort((a, b) =>
    (b.draft?.createdAt ?? b.lead.updatedAt).localeCompare(a.draft?.createdAt ?? a.lead.updatedAt),
  );
}

// leads client-hunter has found but not drafted yet; shown under the inbox drafts
export function newLeads(leads: ClientLeadDetail[]) {
  return leads
    .filter((lead) => lead.status === "new" && !lead.doNotContact)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function waitingLeads(leads: ClientLeadDetail[]) {
  const queued = leads.filter((lead) => lead.status === "approved");
  const out = leads
    .filter((lead) => lead.status === "waiting")
    .sort((a, b) => dueAt(a).localeCompare(dueAt(b)));
  return { queued, out };
}

function dueAt(lead: ClientLead) {
  return (lead.followupSentAt ? lead.coldDueAt : lead.followupDueAt) ?? "9999";
}

export function replyLeads(leads: ClientLeadDetail[]) {
  return leads
    .filter((lead) => lead.status === "replied" || lead.status === "in_talks")
    .sort((a, b) => lastMessageAt(b).localeCompare(lastMessageAt(a)));
}

function lastMessageAt(lead: ClientLeadDetail) {
  return lead.messages.at(-1)?.receivedAt ?? lead.updatedAt;
}

export function activeLeads(leads: ClientLeadDetail[]) {
  return leads.filter((lead) => lead.status === "won");
}

export function archiveLeads(leads: ClientLeadDetail[]) {
  return leads
    .filter((lead) => lead.status === "cold" || lead.status === "dropped")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// the one page a lead shows up on (inbox wins while a draft waits on shamil)
export function viewForLead(lead: ClientLeadDetail): ClientView {
  if (inboxItems([lead]).length > 0) return "inbox";
  switch (lead.status) {
    case "new":
    case "draft_ready":
      return "inbox";
    case "approved":
    case "waiting":
      return "waiting";
    case "replied":
    case "in_talks":
      return "replies";
    case "won":
      return "active";
    case "cold":
    case "dropped":
      return "archive";
  }
}

export function clientViewFromPathname(pathname: string): ClientView {
  const segment = pathname.split("/").filter(Boolean)[1];
  return isClientView(segment) ? segment : "inbox";
}

export function viewCounts(leads: ClientLeadDetail[]): Record<ClientView, number | null> {
  const { queued, out } = waitingLeads(leads);
  return {
    inbox: inboxItems(leads).filter((item) => item.needsAction).length,
    waiting: queued.length + out.length,
    replies: replyLeads(leads).filter((lead) => pendingDraft(lead, ["reply"]) !== null).length,
    active: activeLeads(leads).length,
    archive: null,
  };
}

export const currencySymbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", INR: "₹" };

export function formatMoney(amount: number | null, currency: string) {
  if (amount === null) return "—";
  const symbol = currencySymbols[currency];
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return symbol ? `${symbol}${value}` : `${value} ${currency}`;
}
