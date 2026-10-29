"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ExternalLink,
  Lock,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  Activity,
  ago,
  Chip,
  DropPanel,
  EmailCard,
  formatDay,
  LeadHeader,
  money,
  MoneyField,
  NoteComposer,
  NotDelivered,
  preview,
  relativeDue,
  RevisePanel,
  Section,
  Segmented,
  StageSteps,
  type CardPanel,
} from "@/components/clients/parts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  activeLeads,
  archiveLeads,
  clientDeliveryStatuses,
  clientPaymentStatuses,
  dropReasonLabels,
  inboxItems,
  latestDraft,
  newLeads,
  pendingDraft,
  replyLeads,
  waitingLeads,
  type ClientDraft,
  type ClientDropReason,
  type ClientLeadDetail,
  type ClientTask,
  type ClientView,
} from "@/lib/clients/domain";
import { cn } from "@/lib/utils";

// ---------- model ----------

export type Row = { lead: ClientLeadDetail; draft: ClientDraft | null };
export type ListSection = { id: string; title: string; rows: Row[] };
export type ArchiveFilter = "all" | "cold" | "dropped";

function matches(lead: ClientLeadDetail, query: string) {
  if (!query) return true;
  const haystack = [
    lead.business,
    lead.contactName,
    lead.contactEmail,
    lead.region,
    lead.need,
    lead.siteUrl,
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

// The sections a view's list shows, in display order. j/k and auto-advance walk
// the same order, so the frame builds navigation from this too.
export function buildSections(
  view: ClientView,
  leads: ClientLeadDetail[],
  { query, archiveFilter, now }: { query: string; archiveFilter: ArchiveFilter; now: Date },
): ListSection[] {
  const shown = leads.filter((lead) => matches(lead, query.trim()));
  const rows = (list: ClientLeadDetail[], draft?: (lead: ClientLeadDetail) => ClientDraft | null) =>
    list.map((lead) => ({ lead, draft: draft?.(lead) ?? null }));
  switch (view) {
    case "inbox":
      return [
        { id: "review", title: "To review", rows: inboxItems(shown) },
        { id: "found", title: "Found · drafting", rows: rows(newLeads(shown)) },
      ];
    case "waiting": {
      const { queued, out } = waitingLeads(shown);
      const ready = out.filter((lead) => pendingDraft(lead, ["followup"]));
      const rest = out.filter((lead) => !ready.includes(lead));
      const due = rest.filter((lead) => relativeDue(dueOf(lead), now).days <= 0);
      return [
        { id: "ready", title: "Follow-up ready", rows: rows(ready) },
        { id: "due", title: "Due", rows: rows(due) },
        { id: "out", title: "Waiting on them", rows: rows(rest.filter((l) => !due.includes(l))) },
        { id: "queued", title: "Queued to send", rows: rows(queued) },
      ];
    }
    case "replies": {
      const list = replyLeads(shown);
      const needsYou = (lead: ClientLeadDetail) => lead.onHold || !!pendingDraft(lead, ["reply"]);
      const draft = (lead: ClientLeadDetail) => pendingDraft(lead, ["reply"]);
      return [
        { id: "you", title: "Needs you", rows: rows(list.filter(needsYou), draft) },
        { id: "rest", title: "In conversation", rows: rows(list.filter((l) => !needsYou(l))) },
      ];
    }
    case "active": {
      const list = activeLeads(shown);
      const delivered = (lead: ClientLeadDetail) => lead.deliveryStatus === "delivered";
      return [
        { id: "doing", title: "In progress", rows: rows(list.filter((l) => !delivered(l))) },
        { id: "done", title: "Delivered", rows: rows(list.filter(delivered)) },
      ];
    }
    case "archive":
      return [
        {
          id: "archive",
          title: archiveFilter === "all" ? "Archived" : archiveFilter,
          rows: rows(
            archiveLeads(shown).filter(
              (lead) => archiveFilter === "all" || lead.status === archiveFilter,
            ),
          ),
        },
      ];
  }
}

function dueOf(lead: ClientLeadDetail) {
  return lead.followupSentAt ? lead.coldDueAt : lead.followupDueAt;
}

// ---------- context the frame hands each view ----------

export type ClientActions = {
  approve: (lead: ClientLeadDetail, draft: ClientDraft) => void;
  drop: (lead: ClientLeadDetail, reason: ClientDropReason, note: string) => void;
  revise: (draft: ClientDraft, note: string) => Promise<void>;
  edit: (draft: ClientDraft, subject: string, body: string) => Promise<void>;
  retry: (eventId: string) => void;
  hold: (lead: ClientLeadDetail) => void;
  note: (lead: ClientLeadDetail, body: string) => Promise<void>;
  deal: (lead: ClientLeadDetail, patch: Record<string, unknown>) => Promise<void>;
  tasks: (
    lead: ClientLeadDetail,
    tasks: Array<Pick<ClientTask, "text" | "done" | "blocked">>,
  ) => Promise<void>;
  won: (lead: ClientLeadDetail) => void;
  startTalks: (lead: ClientLeadDetail) => void;
  revive: (lead: ClientLeadDetail) => void;
};

export type ViewContext = {
  view: ClientView;
  loading: boolean;
  sections: ListSection[];
  current: Row | null;
  isGone: (leadId: string) => boolean;
  select: (leadId: string) => void;
  detailOpen: boolean;
  closeDetail: () => void;
  query: string;
  setQuery: (query: string) => void;
  archiveFilter: ArchiveFilter;
  setArchiveFilter: (filter: ArchiveFilter) => void;
  panel: (leadId: string) => CardPanel;
  setPanel: (leadId: string, panel: CardPanel) => void;
  actions: ClientActions;
  openInInbox: (leadId: string) => void;
  now: Date;
};

// ---------- shell ----------

const emptyCopy: Record<ClientView, { title: string; body: string }> = {
  inbox: {
    title: "Inbox zero",
    body: "Nothing to review. client-hunter's next batch of drafts lands here.",
  },
  waiting: { title: "Nothing out", body: "Approved emails show here until they reply." },
  replies: { title: "No replies yet", body: "When someone writes back, the thread shows here." },
  active: { title: "No active clients", body: "Mark a deal as won and the work shows up here." },
  archive: { title: "Archive is empty", body: "Dropped and cold leads end up here." },
};

export function ViewBody({ ctx }: { ctx: ViewContext }) {
  const total = ctx.sections.reduce(
    (sum, section) => sum + section.rows.filter((row) => !ctx.isGone(row.lead.id)).length,
    0,
  );
  const searching = ctx.query.trim() !== "";
  return (
    <div className="clients-split" data-detail={ctx.detailOpen && !!ctx.current}>
      <div className="clients-list" aria-label={`${ctx.view} list`}>
        <ListHead ctx={ctx} total={total} />
        {ctx.loading ? (
          <RowSkeletons />
        ) : total === 0 && !ctx.sections.some((s) => s.rows.some((r) => ctx.isGone(r.lead.id))) ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {searching ? "No matches." : emptyCopy[ctx.view].body}
          </p>
        ) : (
          ctx.sections.map((section) =>
            section.rows.length === 0 ? null : (
              <section key={section.id} aria-label={section.title}>
                <p className="clients-list-label">
                  {section.title}
                  <span className="clients-num">{section.rows.length}</span>
                </p>
                <ul>
                  {section.rows.map((row) => (
                    <ListRow key={row.lead.id} ctx={ctx} row={row} section={section.id} />
                  ))}
                </ul>
              </section>
            ),
          )
        )}
      </div>
      <div className="clients-detail">
        {ctx.current ? (
          <Detail key={ctx.current.lead.id} ctx={ctx} row={ctx.current} />
        ) : ctx.loading ? null : (
          <div className="flex h-full min-h-60 flex-col items-center justify-center gap-1 p-8 text-center">
            <p className="font-medium">{emptyCopy[ctx.view].title}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{emptyCopy[ctx.view].body}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ListHead({ ctx, total }: { ctx: ViewContext; total: number }) {
  return (
    <div className="clients-list-head">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          data-clients-search
          aria-label="search this list"
          placeholder={`Search ${total} ${total === 1 ? "lead" : "leads"}`}
          className="h-8 pr-8 pl-8 text-sm"
          value={ctx.query}
          onChange={(event) => ctx.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              ctx.setQuery("");
              event.currentTarget.blur();
            }
          }}
        />
        <Kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 md:inline-flex">
          /
        </Kbd>
      </div>
      {ctx.view === "archive" ? (
        <fieldset className="clients-segmented mt-2" aria-label="archive filter">
          {(["all", "cold", "dropped"] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={ctx.archiveFilter === id}
              onClick={() => ctx.setArchiveFilter(id)}
            >
              {id}
            </button>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}

function RowSkeletons() {
  return (
    <div aria-busy="true" aria-label="loading">
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="space-y-2 border-b px-4 py-3.5">
          <div className="clients-skeleton h-3.5 w-32 rounded" />
          <div className="clients-skeleton h-3 w-52 max-w-full rounded" />
        </div>
      ))}
    </div>
  );
}

// ---------- list rows ----------

function rowSummary(
  view: ClientView,
  { lead, draft }: Row,
  section: string,
  now: Date,
): { side: ReactNode; line: ReactNode; sub?: ReactNode; attention: boolean } {
  switch (view) {
    case "inbox": {
      if (section === "found") {
        return {
          side: ago(lead.createdAt, now.getTime()),
          line: lead.need || lead.region || "client-hunter is drafting",
          attention: false,
        };
      }
      return {
        side: ago(draft?.createdAt ?? lead.updatedAt, now.getTime()),
        line: draft ? (
          <>
            {draft.kind === "followup" ? <Chip>follow-up</Chip> : null}
            {draft.status === "revision_requested" ? <Chip tone="amber">revising</Chip> : null}
            {draft.version > 1 && draft.status === "pending" ? <Chip>v{draft.version}</Chip> : null}
            <span className="truncate">{draft.subject || preview(draft.body)}</span>
          </>
        ) : (
          "draft missing"
        ),
        sub: draft?.subject ? preview(draft.body) : undefined,
        attention: draft?.status === "pending",
      };
    }
    case "waiting": {
      if (lead.status === "approved") {
        return { side: "queued", line: "Approved · sending soon", attention: false };
      }
      const due = relativeDue(dueOf(lead), now);
      const ready = section === "ready";
      return {
        side: formatDay(lead.followupSentAt ?? lead.firstSentAt),
        line: ready ? (
          <Chip tone="accent">follow-up draft ready</Chip>
        ) : (
          <span className={cn(due.overdue && "clients-amber")}>
            {lead.followupSentAt ? `followed up · cold ${due.text}` : `follow-up ${due.text}`}
          </span>
        ),
        attention: ready,
      };
    }
    case "replies": {
      const last = lead.messages.at(-1);
      return {
        side: ago(last?.receivedAt ?? lead.updatedAt, now.getTime()),
        line: (
          <>
            {lead.status === "in_talks" ? <Chip tone="green">in talks</Chip> : null}
            {lead.onHold ? <Chip tone="amber">with you</Chip> : null}
            {draft ? <Chip tone="accent">reply ready</Chip> : null}
            <span className="truncate">
              {last
                ? `${last.direction === "out" ? "You: " : ""}${preview(last.summary || last.body)}`
                : "—"}
            </span>
          </>
        ),
        attention: !!draft || lead.onHold,
      };
    }
    case "active": {
      const done = lead.tasks.filter((task) => task.done).length;
      return {
        side: <span className="clients-num">{money(lead)}</span>,
        line: (
          <>
            <Chip tone={lead.paymentStatus === "paid" ? "green" : "neutral"}>
              {(lead.paymentStatus ?? "unpaid").replace("_", " ")}
            </Chip>
            {lead.tasks.length ? (
              <span className="clients-num">
                {done}/{lead.tasks.length} tasks
              </span>
            ) : (
              <span>no tasks</span>
            )}
          </>
        ),
        attention: false,
      };
    }
    case "archive":
      return {
        side: formatDay(lead.updatedAt),
        line:
          lead.status === "dropped"
            ? `Dropped · ${lead.dropReason === "other" && lead.dropNote ? lead.dropNote : lead.dropReason ? dropReasonLabels[lead.dropReason] : ""}`
            : "Went cold",
        attention: false,
      };
  }
}

function ListRow({ ctx, row, section }: { ctx: ViewContext; row: Row; section: string }) {
  const { lead } = row;
  const gone = ctx.isGone(lead.id);
  const selected = ctx.current?.lead.id === lead.id;
  const summary = rowSummary(ctx.view, row, section, ctx.now);
  return (
    <li className="clients-collapse" data-gone={gone} aria-hidden={gone} inert={gone}>
      <div>
        <button
          type="button"
          className="clients-row-item"
          data-selected={selected}
          data-lead={lead.id}
          data-section={section}
          data-testid="lead-row"
          aria-current={selected || undefined}
          onClick={() => ctx.select(lead.id)}
        >
          <span className="flex items-baseline gap-2">
            {summary.attention ? <span className="clients-unread" aria-label="needs you" /> : null}
            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-medium">
              {lead.doNotContact ? (
                <Lock className="size-3 shrink-0" aria-label="do not contact" />
              ) : null}
              <span className="truncate">{lead.business}</span>
            </span>
            <span className="clients-num shrink-0 text-xs text-muted-foreground">
              {summary.side}
            </span>
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            {summary.line}
          </span>
          {summary.sub ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground/80">
              {summary.sub}
            </span>
          ) : null}
        </button>
      </div>
    </li>
  );
}

// ---------- detail ----------

function Detail({ ctx, row }: { ctx: ViewContext; row: Row }) {
  const { lead } = row;
  return (
    <div
      className="clients-detail-inner clients-fade-in"
      data-testid="lead-detail"
      data-lead={lead.id}
    >
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground md:hidden"
        onClick={ctx.closeDetail}
      >
        <ArrowLeft className="size-4" /> Back
      </button>
      {ctx.view === "inbox" ? <InboxDetail ctx={ctx} row={row} /> : null}
      {ctx.view === "waiting" ? <WaitingDetail ctx={ctx} lead={lead} /> : null}
      {ctx.view === "replies" ? <RepliesDetail ctx={ctx} row={row} /> : null}
      {ctx.view === "active" ? <ActiveDetail ctx={ctx} lead={lead} /> : null}
      {ctx.view === "archive" ? <ArchiveDetail ctx={ctx} lead={lead} /> : null}
      <div className="mt-3">
        <NotDelivered events={lead.undeliveredEvents} onRetry={ctx.actions.retry} />
      </div>
      <Section title="History">
        <Activity lead={lead} />
      </Section>
    </div>
  );
}

// the email under review plus the sticky approve / revise / edit / drop bar
function DraftReview({
  ctx,
  lead,
  draft,
  extra,
}: {
  ctx: ViewContext;
  lead: ClientLeadDetail;
  draft: ClientDraft;
  extra?: ReactNode;
}) {
  const panel = ctx.panel(lead.id);
  const setPanel = (next: CardPanel) => ctx.setPanel(lead.id, next);
  const pending = draft.status === "pending";
  const lastNote = lead.notes.filter((note) => note.author === "shamil").at(-1);
  return (
    <>
      {draft.status === "revision_requested" ? (
        <div className="mb-3 rounded-lg border border-dashed px-4 py-3 text-sm">
          <p className="font-medium">client-hunter is rewriting this as v{draft.version + 1}</p>
          {lastNote ? (
            <p className="mt-1 text-muted-foreground">You asked: “{lastNote.body}”</p>
          ) : null}
        </div>
      ) : null}
      <EmailCard
        lead={lead}
        draft={draft}
        muted={!pending && panel !== "edit"}
        editing={panel === "edit"}
        onCancel={() => setPanel(null)}
        onSave={(subject, body) =>
          void ctx.actions
            .edit(draft, subject, body)
            .then(() => setPanel(null))
            .catch(() => undefined)
        }
      />
      <div className="clients-actionbar">
        <RevisePanel
          open={panel === "revise"}
          onCancel={() => setPanel(null)}
          onSubmit={(note) =>
            void ctx.actions
              .revise(draft, note)
              .then(() => setPanel(null))
              .catch(() => undefined)
          }
        />
        <DropPanel
          open={panel === "drop"}
          onCancel={() => setPanel(null)}
          onSubmit={(reason, note) => {
            setPanel(null);
            ctx.actions.drop(lead, reason, note);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!pending} onClick={() => ctx.actions.approve(lead, draft)}>
            <Check /> Approve
            <Kbd className="clients-kbd-on-primary">A</Kbd>
          </Button>
          <Button
            variant="outline"
            disabled={!pending}
            aria-expanded={panel === "revise"}
            onClick={() => setPanel(panel === "revise" ? null : "revise")}
          >
            Ask to revise <Kbd className="clients-kbd">R</Kbd>
          </Button>
          <Button
            variant="outline"
            aria-expanded={panel === "edit"}
            onClick={() => setPanel(panel === "edit" ? null : "edit")}
          >
            Edit <Kbd className="clients-kbd">E</Kbd>
          </Button>
          {extra}
          <Button
            variant="ghost"
            className="ml-auto text-muted-foreground"
            aria-expanded={panel === "drop"}
            onClick={() => setPanel(panel === "drop" ? null : "drop")}
          >
            Drop <Kbd className="clients-kbd">D</Kbd>
          </Button>
        </div>
      </div>
    </>
  );
}

function InboxDetail({ ctx, row }: { ctx: ViewContext; row: Row }) {
  const { lead, draft } = row;
  const panel = ctx.panel(lead.id);
  return (
    <>
      <LeadHeader lead={lead} />
      <div className="mt-6">
        {draft ? (
          <>
            {draft.kind === "followup" ? (
              <p className="mb-2 text-xs text-muted-foreground">
                Follow-up · first email went out {formatDay(lead.firstSentAt)}, no reply yet
              </p>
            ) : null}
            <DraftReview ctx={ctx} lead={lead} draft={draft} />
          </>
        ) : (
          <>
            <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {lead.status === "new"
                ? "client-hunter found this lead and is writing the first email."
                : "No draft yet."}
            </div>
            <div className="mt-3">
              <DropPanel
                open={panel === "drop"}
                onCancel={() => ctx.setPanel(lead.id, null)}
                onSubmit={(reason, note) => {
                  ctx.setPanel(lead.id, null);
                  ctx.actions.drop(lead, reason, note);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                aria-expanded={panel === "drop"}
                onClick={() => ctx.setPanel(lead.id, panel === "drop" ? null : "drop")}
              >
                Drop lead
              </Button>
            </div>
            <Section title="Tell client-hunter">
              <NoteComposer
                placeholder="Steer the first email, e.g. lead with their slow checkout"
                onSend={(body) => ctx.actions.note(lead, body)}
              />
            </Section>
          </>
        )}
      </div>
    </>
  );
}

function SentEmails({ lead }: { lead: ClientLeadDetail }) {
  const sent = lead.drafts
    .filter((draft) => draft.status === "sent" || draft.status === "approved")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sent.length === 0) return null;
  return (
    <Section title={sent.length === 1 ? "What you sent" : "What you sent · latest first"}>
      <div className="space-y-3">
        {sent.map((draft) => (
          <EmailCard key={draft.id} lead={lead} draft={draft} muted />
        ))}
      </div>
    </Section>
  );
}

function StatusLine({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm">
      {children}
    </div>
  );
}

function WaitingDetail({ ctx, lead }: { ctx: ViewContext; lead: ClientLeadDetail }) {
  const panel = ctx.panel(lead.id);
  const ready = pendingDraft(lead, ["followup"]);
  const due = relativeDue(dueOf(lead), ctx.now);
  return (
    <>
      <LeadHeader lead={lead} />
      <StatusLine>
        {lead.status === "approved" ? (
          <span>Approved · client-hunter sends it next</span>
        ) : (
          <>
            <span>
              <span className="text-muted-foreground">Sent </span>
              {formatDay(lead.firstSentAt)}
            </span>
            {lead.followupSentAt ? (
              <span>
                <span className="text-muted-foreground">Followed up </span>
                {formatDay(lead.followupSentAt)}
              </span>
            ) : null}
            <span className={cn(due.overdue && "clients-amber")}>
              <span className="text-muted-foreground">
                {lead.followupSentAt ? "Goes cold " : "Follow-up "}
              </span>
              {due.text}
            </span>
          </>
        )}
        {ready ? (
          <Button size="sm" className="ml-auto" onClick={() => ctx.openInInbox(lead.id)}>
            Review follow-up
          </Button>
        ) : null}
      </StatusLine>
      <SentEmails lead={lead} />
      <Section title="Tell client-hunter">
        <NoteComposer
          placeholder="e.g. hold the follow-up, they're closed this week"
          onSend={(body) => ctx.actions.note(lead, body)}
        />
      </Section>
      <div className="mt-4">
        <DropPanel
          open={panel === "drop"}
          onCancel={() => ctx.setPanel(lead.id, null)}
          onSubmit={(reason, note) => {
            ctx.setPanel(lead.id, null);
            ctx.actions.drop(lead, reason, note);
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          aria-expanded={panel === "drop"}
          onClick={() => ctx.setPanel(lead.id, panel === "drop" ? null : "drop")}
        >
          Drop lead
        </Button>
      </div>
    </>
  );
}

function Thread({ lead }: { lead: ClientLeadDetail }) {
  return (
    <ol className="space-y-3" aria-label="thread">
      {lead.messages.map((message) => (
        <li
          key={message.id}
          className="clients-message"
          data-direction={message.direction}
          data-testid="reply-message"
        >
          <p className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {message.direction === "in" ? lead.contactName || lead.business : "You"}
            </span>
            <span>{formatDay(message.receivedAt)}</span>
          </p>
          <p className="text-[15px] leading-7 break-words whitespace-pre-wrap">{message.body}</p>
          {message.summary ? (
            <p
              className="mt-2 border-t pt-2 text-xs leading-5 text-muted-foreground"
              data-testid="reply-summary"
            >
              <span className="font-medium">client-hunter: </span>
              {message.summary}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function DealBlock({ ctx, lead }: { ctx: ViewContext; lead: ClientLeadDetail }) {
  const deal = (patch: Record<string, unknown>) =>
    void ctx.actions.deal(lead, patch).catch(() => undefined);
  return (
    <Section
      title="Deal"
      aside={
        <label className="text-xs text-muted-foreground">
          <span className="sr-only">currency</span>
          <select
            className="rounded-md border bg-background px-1.5 py-0.5 text-xs"
            value={lead.currency}
            onChange={(event) => deal({ currency: event.target.value })}
          >
            {["GBP", "USD", "EUR", "INR"].map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
      }
    >
      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MoneyField
            key={`b-${lead.budgetStated}`}
            label="Their budget"
            value={lead.budgetStated}
            currency={lead.currency}
            onSave={(value) => deal({ budget_stated: value })}
          />
          <MoneyField
            key={`q-${lead.quotedPrice}`}
            label="You quoted"
            value={lead.quotedPrice}
            currency={lead.currency}
            onSave={(value) => deal({ quoted_price: value })}
          />
          <MoneyField
            key={`a-${lead.agreedPrice}`}
            label="Agreed"
            value={lead.agreedPrice}
            currency={lead.currency}
            onSave={(value) => deal({ agreed_price: value })}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">Payment</span>
          <Segmented
            label="payment status"
            options={clientPaymentStatuses}
            value={lead.paymentStatus}
            onChange={(value) => deal({ payment_status: value })}
          />
          <div className="ml-auto flex gap-2">
            {lead.status === "replied" ? (
              <Button size="sm" variant="outline" onClick={() => ctx.actions.startTalks(lead)}>
                Start talks
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={lead.agreedPrice === null}
              title={lead.agreedPrice === null ? "set the agreed price first" : undefined}
              onClick={() => ctx.actions.won(lead)}
            >
              Mark won
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Entering a price moves a replied lead into talks. Won needs an agreed price.
        </p>
      </div>
    </Section>
  );
}

function RepliesDetail({ ctx, row }: { ctx: ViewContext; row: Row }) {
  const { lead, draft } = row;
  const takeOver = (
    <Button variant="outline" onClick={() => ctx.actions.hold(lead)}>
      Take over
    </Button>
  );
  return (
    <>
      <LeadHeader lead={lead} aside={<StageSteps lead={lead} />} />
      <Section title="Conversation">
        <Thread lead={lead} />
      </Section>
      <Section title={lead.onHold ? "You're handling this" : "Your reply"}>
        {lead.onHold ? (
          <NoteComposer
            placeholder="Tell client-hunter what to say next"
            hint="Sending a note hands it back to client-hunter."
            onSend={(body) => ctx.actions.note(lead, body)}
          />
        ) : draft ? (
          <DraftReview ctx={ctx} lead={lead} draft={draft} extra={takeOver} />
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
            <span className="flex-1">client-hunter is drafting a reply.</span>
            <Button size="sm" variant="outline" onClick={() => ctx.actions.hold(lead)}>
              Take over
            </Button>
          </div>
        )}
      </Section>
      <DealBlock ctx={ctx} lead={lead} />
    </>
  );
}

function ActiveDetail({ ctx, lead }: { ctx: ViewContext; lead: ClientLeadDetail }) {
  const [error, setError] = useState<string | null>(null);
  const deal = (patch: Record<string, unknown>) => {
    setError(null);
    ctx.actions
      .deal(lead, patch)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "couldn't save"),
      );
  };
  return (
    <>
      <LeadHeader
        lead={lead}
        aside={
          lead.previewUrl ? (
            <a
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={lead.previewUrl}
              target="_blank"
              rel="noreferrer"
            >
              Preview <ExternalLink />
            </a>
          ) : null
        }
      />
      <div className="mt-5 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
        <div className="bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Agreed</p>
          <p className="clients-num mt-1 text-lg font-semibold" data-testid="project-money">
            {money(lead)}
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Payment</p>
          <Segmented
            label="payment status"
            options={clientPaymentStatuses}
            value={lead.paymentStatus}
            onChange={(value) => deal({ payment_status: value })}
          />
        </div>
        <div className="bg-card px-4 py-3">
          <p className="mb-1.5 text-xs text-muted-foreground">Delivery</p>
          <Segmented
            label="delivery status"
            options={clientDeliveryStatuses}
            value={lead.deliveryStatus}
            onChange={(value) =>
              deal({
                delivery_status: value,
                delivered_at: value === "delivered" ? new Date().toISOString() : null,
              })
            }
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Started {formatDay(lead.startedAt)}
        {lead.deliveredAt ? ` · delivered ${formatDay(lead.deliveredAt)}` : ""}
      </p>
      {error ? (
        <p className="clients-red mt-1 text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <Checklist key={lead.id} lead={lead} onSave={(tasks) => ctx.actions.tasks(lead, tasks)} />
      <Section title="Tell client-hunter">
        <NoteComposer onSend={(body) => ctx.actions.note(lead, body)} />
      </Section>
    </>
  );
}

function Checklist({
  lead,
  onSave,
}: {
  lead: ClientLeadDetail;
  onSave: (tasks: Array<Pick<ClientTask, "text" | "done" | "blocked">>) => Promise<void>;
}) {
  const [tasks, setTasks] = useState(lead.tasks);
  const [synced, setSynced] = useState(lead.tasks);
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (synced !== lead.tasks) {
    // server data changed: adopt it (render-time sync, no effect)
    setSynced(lead.tasks);
    setTasks(lead.tasks);
  }
  const save = async (next: ClientTask[]) => {
    const previous = tasks;
    setTasks(next);
    setError(null);
    try {
      await onSave(next.map(({ text, done, blocked }) => ({ text, done, blocked })));
    } catch (cause) {
      setTasks(previous);
      setError(cause instanceof Error ? cause.message : "couldn't save");
    }
  };
  const move = (index: number, by: number) => {
    const next = [...tasks];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    void save(next.map((task, position) => ({ ...task, position })));
  };
  const done = tasks.filter((task) => task.done).length;
  return (
    <Section
      title="Checklist"
      aside={
        tasks.length ? (
          <span className="clients-num text-xs text-muted-foreground">
            {done} of {tasks.length}
          </span>
        ) : null
      }
    >
      {tasks.length ? (
        <div className="clients-progress mb-3" aria-hidden>
          <span style={{ width: `${(done / tasks.length) * 100}%` }} />
        </div>
      ) : null}
      <ul className="space-y-0.5" aria-label="checklist">
        {tasks.map((task, index) => (
          <li
            key={task.id}
            className="clients-row flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
            data-testid="task"
          >
            <Checkbox
              className="mt-0.5"
              checked={task.done}
              aria-label={task.text}
              onCheckedChange={(checked) =>
                void save(
                  tasks.map((item) => (item.id === task.id ? { ...item, done: !!checked } : item)),
                )
              }
            />
            <span
              className={cn(
                "min-w-0 flex-1 break-words",
                task.done && "text-muted-foreground line-through",
              )}
            >
              {task.text}
            </span>
            {task.blocked ? <Chip tone="amber">blocked</Chip> : null}
            <span className="clients-row-controls flex shrink-0" data-testid="task-controls">
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={task.blocked ? `unblock ${task.text}` : `mark ${task.text} blocked`}
                onClick={() =>
                  void save(
                    tasks.map((item) =>
                      item.id === task.id ? { ...item, blocked: !item.blocked } : item,
                    ),
                  )
                }
              >
                <Lock />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`move ${task.text} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`move ${task.text} down`}
                disabled={index === tasks.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`remove ${task.text}`}
                onClick={() => void save(tasks.filter((item) => item.id !== task.id))}
              >
                <X />
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!newTask.trim()) return;
          void save([
            ...tasks,
            {
              id: `tmp_${Date.now()}`,
              leadId: lead.id,
              text: newTask.trim(),
              done: false,
              blocked: false,
              position: tasks.length,
            },
          ]);
          setNewTask("");
        }}
      >
        <Input
          aria-label="new task"
          placeholder="Add a task"
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
        />
        <Button size="icon" variant="outline" type="submit" aria-label="add task">
          <Plus />
        </Button>
      </form>
      {error ? (
        <p className="clients-red mt-1 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </Section>
  );
}

function ArchiveDetail({ ctx, lead }: { ctx: ViewContext; lead: ClientLeadDetail }) {
  const last = latestDraft(lead, ["first", "followup", "reply"]);
  return (
    <>
      <LeadHeader lead={lead} />
      <StatusLine>
        {lead.status === "dropped" ? (
          <span>
            <span className="text-muted-foreground">Dropped · </span>
            {lead.dropReason === "other" && lead.dropNote
              ? lead.dropNote
              : lead.dropReason
                ? dropReasonLabels[lead.dropReason]
                : "no reason"}
          </span>
        ) : (
          <span>
            <span className="text-muted-foreground">Went cold </span>
            {formatDay(lead.coldAt)}
          </span>
        )}
        {lead.doNotContact ? <Chip tone="amber">do not contact</Chip> : null}
        {lead.status === "cold" ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => ctx.actions.revive(lead)}
          >
            Revive
          </Button>
        ) : null}
      </StatusLine>
      {last ? (
        <Section title="Last email">
          <EmailCard lead={lead} draft={last} muted />
        </Section>
      ) : null}
    </>
  );
}
