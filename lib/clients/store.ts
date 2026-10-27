import type { BatchItem } from "drizzle-orm/batch";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clientDrafts,
  clientEvents,
  clientLeads,
  clientMessages,
  clientNotes,
  clientTasks,
} from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import {
  canTransition,
  isClientCategory,
  isClientContactChannel,
  isClientDeliveryStatus,
  isClientDraftKind,
  isClientDropReason,
  isClientEmailConfidence,
  isClientLeadStatus,
  isClientPaymentStatus,
  isCurrencyCode,
  type ClientBoard,
  type ClientDraft,
  type ClientDraftAuthor,
  type ClientDraftKind,
  type ClientDropReason,
  type ClientEvent,
  type ClientEventAction,
  type ClientLead,
  type ClientLeadDetail,
  type ClientLeadStatus,
  type ClientNoteAuthor,
  type ClientStats,
} from "@/lib/clients/domain";
import { coldDueAtIst, followupDueAtIst, istDayStart } from "@/lib/clients/time";
import { deliverEvent } from "@/lib/clients/webhook";

type LeadRow = typeof clientLeads.$inferSelect;
type LeadInsert = typeof clientLeads.$inferInsert;
type DraftRow = typeof clientDrafts.$inferSelect;
type EventRow = typeof clientEvents.$inferSelect;

export const MAX_DELIVERY_ATTEMPTS = 7; // the first try plus 6 cron retries

// ---------- small helpers ----------

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toMajor(minor: number | null) {
  return minor === null ? null : minor / 100;
}

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function conflict(error: string): never {
  throw new HttpError(409, error);
}

function bad(message: string): never {
  throw new HttpError(400, message);
}

function str(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return "";
  if (typeof value !== "string") bad(`${key} must be a string`);
  return value.trim();
}

function requiredStr(body: Record<string, unknown>, key: string) {
  const value = str(body, key);
  if (!value) bad(`${key} is required`);
  return value;
}

function enumField<T extends string>(
  body: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => value is T,
  nullable = true,
): T | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if ((value === null || value === "") && nullable) return null;
  if (!guard(value)) bad(`${key} is not a valid value`);
  return value;
}

function dateField(body: Record<string, unknown>, key: string): Date | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") bad(`${key} must be an ISO date`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) bad(`${key} must be an ISO date`);
  return date;
}

function moneyField(body: Record<string, unknown>, key: string): number | null | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    bad(`${key} must be a non-negative number`);
  }
  return Math.round(value * 100);
}

function boolField(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") bad(`${key} must be a boolean`);
  return value;
}

// ---------- mapping ----------

function coldDueAt(row: LeadRow) {
  return row.followupSentAt ? coldDueAtIst(row.followupSentAt) : null;
}

export function mapLead(row: LeadRow): ClientLead {
  return {
    id: row.id,
    externalRef: row.externalRef,
    business: row.business,
    contactName: row.contactName,
    region: row.region,
    category: row.category,
    siteUrl: row.siteUrl,
    hookUrl: row.hookUrl,
    need: row.need,
    contactEmail: row.contactEmail,
    contactChannel: row.contactChannel,
    emailConfidence: row.emailConfidence,
    sourceUrl: row.sourceUrl,
    status: row.status,
    onHold: row.onHold,
    doNotContact: row.doNotContact,
    dropReason: row.dropReason,
    dropNote: row.dropNote,
    firstSentAt: iso(row.firstSentAt),
    followupSentAt: iso(row.followupSentAt),
    followupDueAt: iso(row.followupDueAt),
    coldDueAt: iso(coldDueAt(row)),
    coldAt: iso(row.coldAt),
    budgetStated: toMajor(row.budgetStated),
    quotedPrice: toMajor(row.quotedPrice),
    agreedPrice: toMajor(row.agreedPrice),
    currency: row.currency,
    paymentStatus: row.paymentStatus,
    deliveryStatus: row.deliveryStatus,
    previewUrl: row.previewUrl,
    startedAt: iso(row.startedAt),
    deliveredAt: iso(row.deliveredAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapDraft(row: DraftRow): ClientDraft {
  return {
    id: row.id,
    leadId: row.leadId,
    kind: row.kind,
    version: row.version,
    subject: row.subject,
    body: row.body,
    bodySha256: row.bodySha256,
    author: row.author,
    status: row.status,
    approvedAt: iso(row.approvedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapEvent(row: EventRow): ClientEvent {
  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(row.payloadJson);
    if (parsed && typeof parsed === "object") payload = parsed as Record<string, unknown>;
  } catch {
    // keep {}
  }
  return {
    id: row.id,
    leadId: row.leadId,
    action: row.action,
    payload,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: iso(row.deliveredAt),
    attempts: row.attempts,
    lastError: row.lastError,
  };
}

// snake_case shape for the agent API
export function agentLead(lead: ClientLead) {
  return {
    id: lead.id,
    external_ref: lead.externalRef,
    business: lead.business,
    contact_name: lead.contactName,
    region: lead.region,
    category: lead.category,
    site_url: lead.siteUrl,
    hook_url: lead.hookUrl,
    need: lead.need,
    contact_email: lead.contactEmail,
    contact_channel: lead.contactChannel,
    email_confidence: lead.emailConfidence,
    source_url: lead.sourceUrl,
    status: lead.status,
    on_hold: lead.onHold,
    do_not_contact: lead.doNotContact,
    drop_reason: lead.dropReason,
    first_sent_at: lead.firstSentAt,
    followup_sent_at: lead.followupSentAt,
    followup_due_at: lead.followupDueAt,
    cold_due_at: lead.coldDueAt,
    cold_at: lead.coldAt,
    budget_stated: lead.budgetStated,
    quoted_price: lead.quotedPrice,
    agreed_price: lead.agreedPrice,
    currency: lead.currency,
    payment_status: lead.paymentStatus,
    delivery_status: lead.deliveryStatus,
    preview_url: lead.previewUrl,
    started_at: lead.startedAt,
    delivered_at: lead.deliveredAt,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  };
}

export function agentEvent(event: ClientEvent) {
  return {
    ...event.payload,
    event_id: event.id,
    created_at: event.createdAt,
    delivered_at: event.deliveredAt,
    attempts: event.attempts,
  };
}

// ---------- reads ----------

async function leadRow(userId: string, ref: { leadId?: string; externalRef?: string }) {
  const where = ref.leadId
    ? eq(clientLeads.id, ref.leadId)
    : ref.externalRef
      ? eq(clientLeads.externalRef, ref.externalRef)
      : null;
  if (!where) bad("lead_id is required");
  const row = await db()
    .select()
    .from(clientLeads)
    .where(and(eq(clientLeads.userId, userId), where))
    .get();
  if (!row) throw new HttpError(404, "unknown lead");
  return row;
}

export function leadRef(body: Record<string, unknown>) {
  return {
    leadId: str(body, "lead_id") || undefined,
    externalRef: str(body, "external_ref") || undefined,
  };
}

async function draftRow(userId: string, draftId: string) {
  const row = await db()
    .select({ draft: clientDrafts, lead: clientLeads })
    .from(clientDrafts)
    .innerJoin(clientLeads, eq(clientLeads.id, clientDrafts.leadId))
    .where(and(eq(clientDrafts.id, draftId), eq(clientLeads.userId, userId)))
    .get();
  if (!row) throw new HttpError(404, "unknown draft");
  return row;
}

export async function loadBoard(userId: string, now = new Date()): Promise<ClientBoard> {
  const database = db();
  const leadRows = await database
    .select()
    .from(clientLeads)
    .where(eq(clientLeads.userId, userId))
    .orderBy(desc(clientLeads.updatedAt))
    .all();
  const ids = leadRows.map((row) => row.id);
  const empty = ids.length === 0;
  const [drafts, messages, tasks, notes, events] = empty
    ? [[], [], [], [], []]
    : await Promise.all([
        database
          .select()
          .from(clientDrafts)
          .where(inArray(clientDrafts.leadId, ids))
          .orderBy(asc(clientDrafts.createdAt))
          .all(),
        database
          .select()
          .from(clientMessages)
          .where(inArray(clientMessages.leadId, ids))
          .orderBy(asc(clientMessages.receivedAt))
          .all(),
        database
          .select()
          .from(clientTasks)
          .where(inArray(clientTasks.leadId, ids))
          .orderBy(asc(clientTasks.position))
          .all(),
        database
          .select()
          .from(clientNotes)
          .where(inArray(clientNotes.leadId, ids))
          .orderBy(asc(clientNotes.createdAt))
          .all(),
        database
          .select()
          .from(clientEvents)
          .where(and(eq(clientEvents.userId, userId), isNull(clientEvents.deliveredAt)))
          .orderBy(asc(clientEvents.createdAt))
          .all(),
      ]);

  const byLead = <T extends { leadId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) map.set(row.leadId, [...(map.get(row.leadId) ?? []), row]);
    return map;
  };
  const draftsBy = byLead(drafts);
  const messagesBy = byLead(messages);
  const tasksBy = byLead(tasks);
  const notesBy = byLead(notes);
  const eventsBy = byLead(events);

  const leads: ClientLeadDetail[] = leadRows.map((row) => ({
    ...mapLead(row),
    drafts: (draftsBy.get(row.id) ?? []).map(mapDraft),
    messages: (messagesBy.get(row.id) ?? []).map((message) => ({
      id: message.id,
      leadId: message.leadId,
      direction: message.direction,
      body: message.body,
      summary: message.summary,
      receivedAt: message.receivedAt.toISOString(),
    })),
    tasks: (tasksBy.get(row.id) ?? []).map((task) => ({
      id: task.id,
      leadId: task.leadId,
      text: task.text,
      done: task.done,
      blocked: task.blocked,
      position: task.position,
    })),
    notes: (notesBy.get(row.id) ?? []).map((note) => ({
      id: note.id,
      leadId: note.leadId,
      author: note.author,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    })),
    undeliveredEvents: (eventsBy.get(row.id) ?? []).map(mapEvent),
  }));

  return { leads, stats: computeStats(leadRows, messages, now), generatedAt: now.toISOString() };
}

export function computeStats(
  leads: LeadRow[],
  messages: Array<{ leadId: string; direction: string }>,
  now: Date,
): ClientStats {
  const sevenStart = istDayStart(now, -6).getTime();
  const thirtyStart = istDayStart(now, -29).getTime();
  let sent7d = 0;
  for (const lead of leads) {
    if (lead.firstSentAt && lead.firstSentAt.getTime() >= sevenStart) sent7d += 1;
    if (lead.followupSentAt && lead.followupSentAt.getTime() >= sevenStart) sent7d += 1;
  }
  const replied = new Set(messages.filter((m) => m.direction === "in").map((m) => m.leadId));
  const sent30 = leads.filter(
    (lead) => lead.firstSentAt && lead.firstSentAt.getTime() >= thirtyStart,
  );
  const replied30 = sent30.filter((lead) => replied.has(lead.id)).length;
  const earnedMap = new Map<string, number>();
  for (const lead of leads) {
    if (lead.paymentStatus === "paid" && lead.agreedPrice !== null) {
      earnedMap.set(lead.currency, (earnedMap.get(lead.currency) ?? 0) + lead.agreedPrice);
    }
  }
  const earned = [...earnedMap.entries()]
    .filter(([, amount]) => amount > 0)
    .sort(([a], [b]) => (a === "GBP" ? -1 : b === "GBP" ? 1 : a.localeCompare(b)))
    .map(([currency, amount]) => ({ currency, amount: amount / 100 }));
  return {
    sent7d,
    replyRate: sent30.length < 5 ? null : Math.round((replied30 / sent30.length) * 100),
    firstSent30d: sent30.length,
    inTalks: leads.filter((lead) => lead.status === "in_talks").length,
    won: leads.filter((lead) => lead.status === "won").length,
    earned,
  };
}

// ---------- events (outbox) ----------

type EventFields = {
  draft?: DraftRow;
  note?: string;
  reason?: ClientDropReason;
};

async function recordEvent(lead: LeadRow, action: ClientEventAction, fields: EventFields = {}) {
  const at = new Date();
  const id = newId("evt");
  const payload: Record<string, unknown> = {
    event_id: id,
    action,
    lead_id: lead.id,
    external_ref: lead.externalRef,
  };
  if (fields.draft) {
    payload.draft_id = fields.draft.id;
    payload.draft_version = fields.draft.version;
    payload.draft_kind = fields.draft.kind;
    payload.body_sha256 = fields.draft.bodySha256;
  }
  if (fields.note !== undefined && fields.note !== "") payload.note = fields.note;
  if (fields.reason) payload.reason = fields.reason;
  payload.at = at.toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    id,
    statement: db()
      .insert(clientEvents)
      .values({
        id,
        userId: lead.userId,
        leadId: lead.id,
        action,
        payloadJson: JSON.stringify(payload),
        createdAt: at,
        attempts: 0,
      }),
  };
}

export async function attemptDelivery(eventId: string) {
  const row = await db().select().from(clientEvents).where(eq(clientEvents.id, eventId)).get();
  if (!row || row.deliveredAt) return row ? mapEvent(row) : null;
  const result = await deliverEvent(row.payloadJson);
  const update = result.ok
    ? { deliveredAt: new Date(), attempts: row.attempts + 1, lastError: null }
    : { attempts: row.attempts + 1, lastError: result.error };
  const updated = await db()
    .update(clientEvents)
    .set(update)
    .where(and(eq(clientEvents.id, eventId), isNull(clientEvents.deliveredAt)))
    .returning()
    .get();
  return updated ? mapEvent(updated) : null;
}

export async function retryEvent(userId: string, eventId: string) {
  const row = await db()
    .select()
    .from(clientEvents)
    .where(and(eq(clientEvents.id, eventId), eq(clientEvents.userId, userId)))
    .get();
  if (!row) throw new HttpError(404, "unknown event");
  return attemptDelivery(eventId);
}

export async function retryUndelivered(limit = 50) {
  const rows = await db()
    .select({ id: clientEvents.id })
    .from(clientEvents)
    .where(and(isNull(clientEvents.deliveredAt), lt(clientEvents.attempts, MAX_DELIVERY_ATTEMPTS)))
    .orderBy(asc(clientEvents.createdAt))
    .limit(limit)
    .all();
  const results = [];
  for (const row of rows) results.push(await attemptDelivery(row.id));
  return {
    tried: rows.length,
    delivered: results.filter((event) => event?.deliveredAt).length,
  };
}

export async function listEvents(userId: string, since: Date | null) {
  const rows = await db()
    .select()
    .from(clientEvents)
    .where(
      since
        ? and(eq(clientEvents.userId, userId), gt(clientEvents.createdAt, since))
        : eq(clientEvents.userId, userId),
    )
    .orderBy(asc(clientEvents.createdAt))
    .limit(500)
    .all();
  return rows.map(mapEvent);
}

// ---------- cold sweep (daily cron) ----------

export async function runColdSweep(now = new Date()) {
  const candidates = await db()
    .select()
    .from(clientLeads)
    .where(and(eq(clientLeads.status, "waiting"), isNotNull(clientLeads.followupSentAt)))
    .all();
  const due = candidates.filter((row) => {
    const deadline = coldDueAt(row);
    return deadline !== null && deadline.getTime() <= now.getTime();
  });
  if (due.length === 0) return { moved: 0 };
  const replied = await db()
    .select({ leadId: clientMessages.leadId })
    .from(clientMessages)
    .where(
      and(
        inArray(
          clientMessages.leadId,
          due.map((row) => row.id),
        ),
        eq(clientMessages.direction, "in"),
      ),
    )
    .all();
  const repliedIds = new Set(replied.map((row) => row.leadId));
  const toCold = due.filter((row) => !repliedIds.has(row.id));
  for (const row of toCold) {
    await db()
      .update(clientLeads)
      .set({ status: "cold", coldAt: now, updatedAt: now })
      .where(and(eq(clientLeads.id, row.id), eq(clientLeads.status, "waiting")));
  }
  return { moved: toCold.length };
}

// ---------- agent writes ----------

const infoKeys = [
  ["business", "business"],
  ["contact_name", "contactName"],
  ["region", "region"],
  ["site_url", "siteUrl"],
  ["hook_url", "hookUrl"],
  ["need", "need"],
  ["contact_email", "contactEmail"],
  ["source_url", "sourceUrl"],
  ["preview_url", "previewUrl"],
] as const;

function leadInfoPatch(body: Record<string, unknown>): Partial<LeadInsert> {
  const patch: Partial<LeadInsert> = {};
  for (const [key, field] of infoKeys) {
    const value = str(body, key);
    if (value !== undefined) patch[field] = value;
  }
  const category = enumField(body, "category", isClientCategory);
  if (category !== undefined) patch.category = category;
  const channel = enumField(body, "contact_channel", isClientContactChannel, false);
  if (channel) patch.contactChannel = channel;
  const confidence = enumField(body, "email_confidence", isClientEmailConfidence);
  if (confidence !== undefined) patch.emailConfidence = confidence;
  return patch;
}

function dealPatch(body: Record<string, unknown>): Partial<LeadInsert> {
  const patch: Partial<LeadInsert> = {};
  const budget = moneyField(body, "budget_stated");
  if (budget !== undefined) patch.budgetStated = budget;
  const quoted = moneyField(body, "quoted_price");
  if (quoted !== undefined) patch.quotedPrice = quoted;
  const agreed = moneyField(body, "agreed_price");
  if (agreed !== undefined) patch.agreedPrice = agreed;
  if (body.currency !== undefined) {
    if (!isCurrencyCode(body.currency)) bad("currency must be a 3-letter code like GBP");
    patch.currency = body.currency;
  }
  const payment = enumField(body, "payment_status", isClientPaymentStatus);
  if (payment !== undefined) patch.paymentStatus = payment;
  const delivery = enumField(body, "delivery_status", isClientDeliveryStatus);
  if (delivery !== undefined) patch.deliveryStatus = delivery;
  const preview = str(body, "preview_url");
  if (preview !== undefined) patch.previewUrl = preview;
  const deliveredAt = dateField(body, "delivered_at");
  if (deliveredAt !== undefined) patch.deliveredAt = deliveredAt;
  const startedAt = dateField(body, "started_at");
  if (startedAt !== undefined) patch.startedAt = startedAt;
  return patch;
}

function statusSideEffects(
  status: ClientLeadStatus,
  current: Partial<LeadRow>,
  reason: ClientDropReason | null | undefined,
  at: Date,
): Partial<LeadInsert> {
  const patch: Partial<LeadInsert> = { status };
  if (status === "won") {
    patch.paymentStatus = current.paymentStatus ?? "unpaid";
    patch.deliveryStatus = current.deliveryStatus ?? "in_progress";
    patch.startedAt = current.startedAt ?? at;
  }
  if (status === "cold") patch.coldAt = at;
  if (status === "dropped") {
    patch.dropReason = reason ?? "other";
    if (reason === "said_no") patch.doNotContact = true;
  }
  return patch;
}

export async function upsertLead(userId: string, body: Record<string, unknown>) {
  const externalRef = requiredStr(body, "external_ref");
  const now = new Date();
  const info = leadInfoPatch(body);
  const deal = dealPatch(body);
  const status = enumField(body, "status", isClientLeadStatus, false) ?? undefined;
  const reason = enumField(body, "drop_reason", isClientDropReason);
  const firstSentAt = dateField(body, "first_sent_at");
  const followupSentAt = dateField(body, "followup_sent_at");
  const timing: Partial<LeadInsert> = {};
  if (firstSentAt !== undefined) {
    timing.firstSentAt = firstSentAt;
    timing.followupDueAt = firstSentAt ? followupDueAtIst(firstSentAt) : null;
  }
  if (followupSentAt !== undefined) timing.followupSentAt = followupSentAt;

  const existing = await db()
    .select()
    .from(clientLeads)
    .where(and(eq(clientLeads.userId, userId), eq(clientLeads.externalRef, externalRef)))
    .get();

  if (!existing) {
    const business = requiredStr(body, "business");
    const initial = status ?? "new";
    const values: LeadInsert = {
      id: newId("lead"),
      userId,
      externalRef,
      ...info,
      business,
      ...deal,
      ...timing,
      ...statusSideEffects(initial, deal, reason, now),
      createdAt: now,
      updatedAt: now,
    };
    const row = await db().insert(clientLeads).values(values).returning().get();
    return { lead: mapLead(row), created: true };
  }

  let statusPatch: Partial<LeadInsert> = {};
  if (status && status !== existing.status) {
    if (existing.doNotContact) conflict("do_not_contact");
    if (!canTransition(existing.status, status)) conflict("illegal_transition");
    statusPatch = statusSideEffects(status, { ...existing, ...deal }, reason, now);
  }
  const row = await db()
    .update(clientLeads)
    .set({ ...info, ...deal, ...timing, ...statusPatch, updatedAt: now })
    .where(eq(clientLeads.id, existing.id))
    .returning()
    .get();
  return { lead: mapLead(row), created: false };
}

export async function listLeadsForAgent(
  userId: string,
  status: ClientLeadStatus | null,
  since: Date | null,
) {
  const filters = [eq(clientLeads.userId, userId)];
  if (status) filters.push(eq(clientLeads.status, status));
  if (since) filters.push(gt(clientLeads.updatedAt, since));
  const rows = await db()
    .select()
    .from(clientLeads)
    .where(and(...filters))
    .orderBy(desc(clientLeads.updatedAt))
    .all();
  return rows.map(mapLead);
}

const draftLeadStatuses: Record<ClientDraftKind, readonly ClientLeadStatus[]> = {
  first: ["new", "draft_ready"],
  followup: ["waiting"],
  reply: ["replied", "in_talks"],
};

async function nextVersion(leadId: string, kind: ClientDraftKind) {
  const latest = await db()
    .select({ version: clientDrafts.version })
    .from(clientDrafts)
    .where(and(eq(clientDrafts.leadId, leadId), eq(clientDrafts.kind, kind)))
    .orderBy(desc(clientDrafts.version))
    .limit(1)
    .get();
  return (latest?.version ?? 0) + 1;
}

async function insertDraftVersion(
  lead: LeadRow,
  kind: ClientDraftKind,
  subject: string,
  body: string,
  author: ClientDraftAuthor,
) {
  const now = new Date();
  const version = await nextVersion(lead.id, kind);
  const id = newId("drf");
  const bodySha256 = await sha256Hex(body);
  const database = db();
  const statements = [
    database
      .update(clientDrafts)
      .set({ status: "superseded" })
      .where(
        and(
          eq(clientDrafts.leadId, lead.id),
          eq(clientDrafts.kind, kind),
          inArray(clientDrafts.status, ["pending", "revision_requested"]),
        ),
      ),
    database.insert(clientDrafts).values({
      id,
      leadId: lead.id,
      kind,
      version,
      subject,
      body,
      bodySha256,
      author,
      status: "pending",
      createdAt: now,
    }),
    database
      .update(clientLeads)
      .set(
        kind === "first" && lead.status === "new"
          ? { status: "draft_ready", updatedAt: now }
          : { updatedAt: now },
      )
      .where(eq(clientLeads.id, lead.id)),
  ] as const;
  await database.batch(statements);
  return { draft_id: id, version, body_sha256: bodySha256 };
}

export async function addDraft(userId: string, body: Record<string, unknown>) {
  const lead = await leadRow(userId, leadRef(body));
  const kind = enumField(body, "kind", isClientDraftKind, false);
  if (!kind) bad("kind is required");
  const subject = str(body, "subject") ?? "";
  const text = body.body;
  if (typeof text !== "string" || text.trim() === "") bad("body is required");
  if (lead.doNotContact) conflict("do_not_contact");
  if (lead.onHold) conflict("on_hold");
  if (!draftLeadStatuses[kind].includes(lead.status)) conflict("illegal_transition");
  if (kind === "followup" && lead.followupSentAt) conflict("illegal_transition");
  return insertDraftVersion(lead, kind, subject, text, "agent");
}

export async function updateStatus(userId: string, body: Record<string, unknown>) {
  const lead = await leadRow(userId, leadRef(body));
  const rawStatus = body.status;
  const at = dateField(body, "at") ?? new Date();
  const now = new Date();
  if (lead.doNotContact) conflict("do_not_contact");

  if (rawStatus === "sent") {
    const kind = enumField(body, "kind", isClientDraftKind, false) ?? "first";
    const approved = await db()
      .select()
      .from(clientDrafts)
      .where(
        and(
          eq(clientDrafts.leadId, lead.id),
          eq(clientDrafts.kind, kind),
          eq(clientDrafts.status, "approved"),
        ),
      )
      .orderBy(desc(clientDrafts.version))
      .get();
    if (!approved) conflict("illegal_transition");
    let leadPatch: Partial<LeadInsert>;
    if (kind === "first") {
      if (lead.status !== "approved") conflict("illegal_transition");
      leadPatch = {
        status: "waiting",
        firstSentAt: at,
        followupDueAt: followupDueAtIst(at),
      };
    } else if (kind === "followup") {
      if (lead.status !== "waiting" || lead.followupSentAt) conflict("illegal_transition");
      leadPatch = { followupSentAt: at };
    } else {
      leadPatch = {};
    }
    const database = db();
    await database.batch([
      database.update(clientDrafts).set({ status: "sent" }).where(eq(clientDrafts.id, approved.id)),
      database
        .update(clientLeads)
        .set({ ...leadPatch, updatedAt: now })
        .where(eq(clientLeads.id, lead.id)),
    ]);
    return mapLead(await leadRow(userId, { leadId: lead.id }));
  }

  if (!isClientLeadStatus(rawStatus)) bad("status is not a valid value");
  const status = rawStatus;
  if (status === "approved") conflict("illegal_transition"); // only shamil approves
  if (!canTransition(lead.status, status)) conflict("illegal_transition");
  const reason = enumField(body, "reason", isClientDropReason);
  const patch = statusSideEffects(status, lead, reason, at);
  const database = db();
  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
    database
      .update(clientLeads)
      .set({ ...patch, updatedAt: now })
      .where(eq(clientLeads.id, lead.id)),
  ];
  if (status === "dropped") statements.push(rejectOpenDrafts(lead.id));
  await database.batch(statements);
  return mapLead(await leadRow(userId, { leadId: lead.id }));
}

function rejectOpenDrafts(leadId: string) {
  return db()
    .update(clientDrafts)
    .set({ status: "rejected" })
    .where(
      and(
        eq(clientDrafts.leadId, leadId),
        inArray(clientDrafts.status, ["pending", "revision_requested", "approved"]),
      ),
    );
}

export async function logReply(userId: string, body: Record<string, unknown>) {
  const lead = await leadRow(userId, leadRef(body));
  const text = body.body;
  if (typeof text !== "string" || text.trim() === "") bad("body is required");
  const summary = str(body, "summary") ?? "";
  const receivedAt = dateField(body, "received_at") ?? new Date();
  if (lead.doNotContact) conflict("do_not_contact");
  const moves: Partial<Record<ClientLeadStatus, ClientLeadStatus>> = {
    waiting: "replied",
    cold: "replied",
    replied: "replied",
    in_talks: "in_talks",
    won: "won",
  };
  const next = moves[lead.status];
  if (!next) conflict("illegal_transition");
  const now = new Date();
  const id = newId("msg");
  const database = db();
  await database.batch([
    database
      .insert(clientMessages)
      .values({ id, leadId: lead.id, direction: "in", body: text, summary, receivedAt }),
    database
      .update(clientLeads)
      .set({ status: next, coldAt: next === "replied" ? null : lead.coldAt, updatedAt: now })
      .where(eq(clientLeads.id, lead.id)),
  ]);
  return { message_id: id, lead: agentLead(mapLead(await leadRow(userId, { leadId: lead.id }))) };
}

export async function addNote(
  userId: string,
  leadId: string | { leadId?: string; externalRef?: string },
  text: string,
  author: ClientNoteAuthor,
) {
  const lead = await leadRow(userId, typeof leadId === "string" ? { leadId } : leadId);
  if (text.trim() === "") bad("body is required");
  const now = new Date();
  const id = newId("note");
  const database = db();
  if (author === "agent") {
    await database
      .insert(clientNotes)
      .values({ id, leadId: lead.id, author, body: text, createdAt: now });
    return { note_id: id };
  }
  // shamil's note goes to client-hunter and releases a hold
  const event = await recordEvent(lead, "note", { note: text });
  await database.batch([
    database
      .insert(clientNotes)
      .values({ id, leadId: lead.id, author, body: text, createdAt: now }),
    database
      .update(clientLeads)
      .set({ onHold: false, updatedAt: now })
      .where(eq(clientLeads.id, lead.id)),
    event.statement,
  ]);
  await attemptDelivery(event.id);
  return { note_id: id, event_id: event.id };
}

export async function updateDeal(
  userId: string,
  ref: { leadId?: string; externalRef?: string },
  body: Record<string, unknown>,
) {
  const lead = await leadRow(userId, ref);
  const patch = dealPatch(body);
  // "budget or scope discussed": the first price on a replied lead moves it to in_talks
  const pricing = [patch.budgetStated, patch.quotedPrice, patch.agreedPrice];
  if (lead.status === "replied" && pricing.some((value) => value !== undefined && value !== null)) {
    patch.status = "in_talks";
  }
  const row = await db()
    .update(clientLeads)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(clientLeads.id, lead.id))
    .returning()
    .get();
  return mapLead(row);
}

export async function setTasks(
  userId: string,
  ref: { leadId?: string; externalRef?: string },
  tasks: unknown,
) {
  const lead = await leadRow(userId, ref);
  if (!Array.isArray(tasks)) bad("tasks must be an array");
  const rows = tasks.map((task, index) => {
    if (!task || typeof task !== "object") bad("each task must be an object");
    const record = task as Record<string, unknown>;
    const text = requiredStr(record, "text");
    return {
      id: newId("tsk"),
      leadId: lead.id,
      text,
      done: boolField(record, "done") ?? false,
      blocked: boolField(record, "blocked") ?? false,
      position: index,
    };
  });
  const database = db();
  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
    database.delete(clientTasks).where(eq(clientTasks.leadId, lead.id)),
    ...rows.map((row) => database.insert(clientTasks).values(row)),
    database.update(clientLeads).set({ updatedAt: new Date() }).where(eq(clientLeads.id, lead.id)),
  ];
  await database.batch(statements);
  return rows.map(({ leadId: _leadId, ...task }) => task);
}

// ---------- shamil's actions (browser) ----------

export async function approveDraft(userId: string, draftId: string, body: Record<string, unknown>) {
  const { draft, lead } = await draftRow(userId, draftId);
  const version = body.version;
  const sha = body.body_sha256;
  const latest = await db()
    .select({ id: clientDrafts.id, version: clientDrafts.version })
    .from(clientDrafts)
    .where(and(eq(clientDrafts.leadId, lead.id), eq(clientDrafts.kind, draft.kind)))
    .orderBy(desc(clientDrafts.version))
    .limit(1)
    .get();
  if (
    draft.status !== "pending" ||
    latest?.id !== draft.id ||
    version !== draft.version ||
    sha !== draft.bodySha256
  ) {
    conflict("stale");
  }
  if (lead.doNotContact) conflict("do_not_contact");
  if (!draftLeadStatuses[draft.kind].includes(lead.status)) conflict("illegal_transition");
  const now = new Date();
  const event = await recordEvent(lead, "approve", { draft });
  const database = db();
  await database.batch([
    database
      .update(clientDrafts)
      .set({ status: "approved", approvedAt: now })
      .where(and(eq(clientDrafts.id, draft.id), eq(clientDrafts.status, "pending"))),
    database
      .update(clientLeads)
      .set(draft.kind === "first" ? { status: "approved", updatedAt: now } : { updatedAt: now })
      .where(eq(clientLeads.id, lead.id)),
    event.statement,
  ]);
  return { event: await attemptDelivery(event.id) };
}

export async function reviseDraft(userId: string, draftId: string, note: string) {
  const { draft, lead } = await draftRow(userId, draftId);
  if (note.trim() === "") bad("note is required");
  if (draft.status !== "pending") conflict("stale");
  const now = new Date();
  const event = await recordEvent(lead, "revise", { draft, note });
  const database = db();
  await database.batch([
    database
      .update(clientDrafts)
      .set({ status: "revision_requested" })
      .where(eq(clientDrafts.id, draft.id)),
    database
      .insert(clientNotes)
      .values({ id: newId("note"), leadId: lead.id, author: "shamil", body: note, createdAt: now }),
    database.update(clientLeads).set({ updatedAt: now }).where(eq(clientLeads.id, lead.id)),
    event.statement,
  ]);
  return { event: await attemptDelivery(event.id) };
}

export async function editDraft(userId: string, draftId: string, body: Record<string, unknown>) {
  const { draft, lead } = await draftRow(userId, draftId);
  if (draft.status !== "pending" && draft.status !== "revision_requested") conflict("stale");
  if (lead.doNotContact) conflict("do_not_contact");
  const subject = str(body, "subject") ?? draft.subject;
  const text = body.body;
  if (typeof text !== "string" || text.trim() === "") bad("body is required");
  // saving never approves; it only creates v(n+1) authored by shamil
  return insertDraftVersion(lead, draft.kind, subject, text, "shamil");
}

export async function dropLead(userId: string, leadId: string, reasonValue: unknown, note: string) {
  const lead = await leadRow(userId, { leadId });
  if (!isClientDropReason(reasonValue)) bad("reason is not a valid value");
  if (lead.status === "dropped") conflict("illegal_transition");
  if (!canTransition(lead.status, "dropped")) conflict("illegal_transition");
  const now = new Date();
  const event = await recordEvent(lead, "drop", { reason: reasonValue, note });
  const database = db();
  await database.batch([
    database
      .update(clientLeads)
      .set({
        ...statusSideEffects("dropped", lead, reasonValue, now),
        dropNote: note,
        updatedAt: now,
      })
      .where(eq(clientLeads.id, lead.id)),
    rejectOpenDrafts(lead.id),
    event.statement,
  ]);
  return { event: await attemptDelivery(event.id) };
}

export async function reviveLead(userId: string, leadId: string) {
  const lead = await leadRow(userId, { leadId });
  if (lead.status !== "cold") conflict("illegal_transition");
  const now = new Date();
  const event = await recordEvent(lead, "revive");
  const database = db();
  await database.batch([
    database
      .update(clientLeads)
      .set({
        status: "new",
        coldAt: null,
        firstSentAt: null,
        followupSentAt: null,
        followupDueAt: null,
        updatedAt: now,
      })
      .where(eq(clientLeads.id, lead.id)),
    event.statement,
  ]);
  return { event: await attemptDelivery(event.id) };
}

export async function holdLead(userId: string, leadId: string, note: string) {
  const lead = await leadRow(userId, { leadId });
  if (lead.doNotContact || lead.status === "dropped") conflict("illegal_transition");
  const now = new Date();
  const event = await recordEvent(lead, "hold", { note });
  const database = db();
  await database.batch([
    database
      .update(clientLeads)
      .set({ onHold: true, updatedAt: now })
      .where(eq(clientLeads.id, lead.id)),
    event.statement,
  ]);
  return { event: await attemptDelivery(event.id) };
}

export async function markWon(userId: string, leadId: string) {
  const lead = await leadRow(userId, { leadId });
  if (lead.agreedPrice === null) bad("set the agreed price first");
  if (!canTransition(lead.status, "won")) conflict("illegal_transition");
  const now = new Date();
  const row = await db()
    .update(clientLeads)
    .set({ ...statusSideEffects("won", lead, null, now), updatedAt: now })
    .where(and(eq(clientLeads.id, lead.id), ne(clientLeads.status, "dropped")))
    .returning()
    .get();
  return mapLead(row);
}

export async function moveToInTalks(userId: string, leadId: string) {
  const lead = await leadRow(userId, { leadId });
  if (lead.status !== "replied") conflict("illegal_transition");
  const row = await db()
    .update(clientLeads)
    .set({ status: "in_talks", updatedAt: new Date() })
    .where(eq(clientLeads.id, lead.id))
    .returning()
    .get();
  return mapLead(row);
}
