"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, Lock, Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  contactLabel,
  DraftBody,
  DropPanel,
  formatDay,
  LeadHeading,
  NotDelivered,
  RevisePanel,
  type CardPanel,
} from "@/components/clients/draft-card";
import { ActionErrorBanner } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { clientKeys, useClientBoardQuery } from "@/hooks/use-clients";
import {
  approveDraftRequest,
  ClientsApiError,
  dealRequest,
  dropLeadRequest,
  editDraftRequest,
  holdLeadRequest,
  leadActionRequest,
  noteRequest,
  retryEventRequest,
  reviseDraftRequest,
  tasksRequest,
} from "@/lib/clients/api";
import {
  activeLeads,
  archiveLeads,
  clientDeliveryStatuses,
  clientPaymentStatuses,
  clientViews,
  dropReasonLabels,
  formatMoney,
  inboxItems,
  isClientView,
  latestDraft,
  pendingDraft,
  replyLeads,
  statusLabels,
  viewCounts,
  waitingLeads,
  type ClientBoard,
  type ClientDraft,
  type ClientDropReason,
  type ClientLeadDetail,
  type ClientStats,
  type ClientTask,
  type ClientView,
} from "@/lib/clients/domain";
import { cn } from "@/lib/utils";

const UNDO_MS = 4000;
const EXIT_MS = 240;

const viewLabels: Record<ClientView, string> = {
  inbox: "inbox",
  waiting: "waiting",
  replies: "replies",
  active: "active",
  archive: "archive",
};

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

// active view lives in the url (?view=replies)
const VIEW_EVENT = "clients:view";

function subscribeView(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(VIEW_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(VIEW_EVENT, onChange);
  };
}

function readViewFromUrl(): ClientView {
  const value = new URLSearchParams(window.location.search).get("view");
  return isClientView(value) ? value : "inbox";
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function errorText(cause: unknown) {
  if (cause instanceof ClientsApiError && cause.message === "stale") {
    return "a newer version arrived, showing it now.";
  }
  return cause instanceof Error ? cause.message : "something went wrong";
}

// ---------- pending (undoable) actions ----------

type PendingAction = {
  key: string; // card key hidden while pending
  label: string;
  commit: (keepalive: boolean) => Promise<unknown>;
};

function useUndoQueue(onError: (cause: unknown) => void) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const pendingRef = useRef<PendingAction | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const unhide = useCallback((key: string) => {
    setHidden((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setExiting((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }, []);

  const flush = useCallback(
    (keepalive: boolean) => {
      const action = pendingRef.current;
      if (!action) return;
      pendingRef.current = null;
      clearTimer();
      setLeaving(true);
      window.setTimeout(() => {
        setPending(null);
        setLeaving(false);
      }, 120);
      void action
        .commit(keepalive)
        .catch((cause) => onError(cause))
        .finally(async () => {
          await queryClient.invalidateQueries({ queryKey: clientKeys.board });
          unhide(action.key);
        });
    },
    [onError, queryClient, unhide],
  );

  const schedule = useCallback(
    (action: PendingAction) => {
      if (pendingRef.current) flush(false);
      setExiting((current) => new Set(current).add(action.key));
      window.setTimeout(() => setHidden((current) => new Set(current).add(action.key)), EXIT_MS);
      pendingRef.current = action;
      setPending(action);
      setLeaving(false);
      timerRef.current = window.setTimeout(() => flush(false), UNDO_MS);
    },
    [flush],
  );

  const undo = useCallback(() => {
    const action = pendingRef.current;
    if (!action) return false;
    pendingRef.current = null;
    clearTimer();
    unhide(action.key);
    setLeaving(true);
    window.setTimeout(() => {
      setPending(null);
      setLeaving(false);
    }, 120);
    return true;
  }, [unhide]);

  useEffect(() => {
    const onPageHide = () => flush(true);
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flush]);

  return { pending, leaving, hidden, exiting, schedule, undo };
}

// ---------- stats strip ----------

function TweenNumber({ value, reduced }: { value: number; reduced: boolean }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    if (reduced) {
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / 300);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <span className="clients-num">{reduced ? value : shown}</span>;
}

function StatsStrip({ stats, reduced }: { stats: ClientStats; reduced: boolean }) {
  const earned = stats.earned.length
    ? stats.earned.map((item) => formatMoney(item.amount, item.currency)).join(" + ")
    : formatMoney(0, "GBP");
  const items: Array<[string, ReactNode]> = [
    ["sent 7d", <TweenNumber key="s" value={stats.sent7d} reduced={reduced} />],
    [
      "reply rate",
      stats.replyRate === null ? (
        <span key="r" className="clients-num">
          —
        </span>
      ) : (
        <span key="r">
          <TweenNumber value={stats.replyRate} reduced={reduced} />%
        </span>
      ),
    ],
    ["in talks", <TweenNumber key="t" value={stats.inTalks} reduced={reduced} />],
    ["won", <TweenNumber key="w" value={stats.won} reduced={reduced} />],
  ];
  return (
    <p
      className="clients-num flex flex-wrap gap-x-3 gap-y-1 px-4 text-sm text-muted-foreground md:px-7"
      data-testid="stats"
    >
      {items.map(([label, value]) => (
        <span key={label} data-stat={label}>
          {label} <span className="font-medium text-foreground">{value}</span>
          <span aria-hidden> ·</span>
        </span>
      ))}
      <span data-stat="earned">
        <span className="font-medium text-foreground">{earned}</span> earned
      </span>
    </p>
  );
}

// ---------- segmented control ----------

function ViewTabs({
  view,
  counts,
  onChange,
}: {
  view: ClientView;
  counts: Record<ClientView, number | null>;
  onChange: (view: ClientView) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>(`[data-view="${view}"]`);
    if (list && active) setIndicator({ x: active.offsetLeft, w: active.offsetWidth });
  }, [view, counts]);
  return (
    <div
      ref={listRef}
      role="tablist"
      tabIndex={-1}
      aria-label="clients views"
      className="clients-tabs"
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        const index = clientViews.indexOf(view);
        const next =
          clientViews[(index + (event.key === "ArrowRight" ? 1 : -1) + 5) % clientViews.length];
        onChange(next);
        listRef.current?.querySelector<HTMLElement>(`[data-view="${next}"]`)?.focus();
      }}
    >
      {indicator ? (
        <span
          className="clients-tab-indicator"
          style={{ transform: `translateX(${indicator.x}px)`, width: indicator.w }}
          aria-hidden
        />
      ) : null}
      {clientViews.map((id, index) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`clients-tab-${id}`}
          data-view={id}
          aria-selected={view === id}
          aria-controls="clients-view"
          tabIndex={view === id ? 0 : -1}
          className="clients-tab"
          onClick={() => onChange(id)}
          title={`${viewLabels[id]} (${index + 1})`}
        >
          {viewLabels[id]}
          {counts[id] !== null ? <span className="clients-num">{counts[id]}</span> : null}
        </button>
      ))}
    </div>
  );
}

// ---------- shared draft actions card ----------

type DraftActions = {
  approve: (lead: ClientLeadDetail, draft: ClientDraft) => void;
  revise: (draft: ClientDraft, note: string) => Promise<void>;
  edit: (draft: ClientDraft, subject: string, body: string) => Promise<void>;
  drop: (lead: ClientLeadDetail, reason: ClientDropReason, note: string) => void;
  retry: (eventId: string) => void;
};

function LeadCard({
  lead,
  draft,
  cardKey,
  selected,
  exiting,
  gone,
  panel,
  setPanel,
  actions,
  extraActions,
  header = true,
  onFocus,
}: {
  lead: ClientLeadDetail;
  draft: ClientDraft | null;
  cardKey: string;
  selected: boolean;
  exiting: boolean;
  gone: boolean;
  panel: CardPanel;
  setPanel: (panel: CardPanel) => void;
  actions: DraftActions;
  extraActions?: ReactNode;
  header?: boolean;
  onFocus?: () => void;
}) {
  const pending = draft?.status === "pending";
  const followup = draft?.kind === "followup";
  return (
    <li className="clients-collapse list-none" data-gone={gone}>
      <div>
        <div
          className="clients-card mb-3 p-4"
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- spec: cards are keyboard-navigable (j/k) with a visible focus ring
          tabIndex={0}
          data-card={cardKey}
          data-selected={selected}
          data-exiting={exiting}
          data-testid="lead-card"
          aria-label={`${lead.business}${draft ? `, draft v${draft.version}` : ""}`}
          onFocus={onFocus}
        >
          {header ? <LeadHeading lead={lead} /> : null}
          {followup ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">follow-up</Badge>
              <span>first sent {formatDay(lead.firstSentAt)}</span>
            </div>
          ) : null}
          {draft ? (
            <DraftBody
              draft={draft}
              editing={panel === "edit"}
              onCancel={() => setPanel(null)}
              onSave={(subject, body) => {
                void actions.edit(draft, subject, body).then(() => setPanel(null));
              }}
            />
          ) : (
            <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              draft missing
            </p>
          )}
          {draft?.status === "revision_requested" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              waiting for client-hunter's v{draft.version + 1}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={!pending}
              onClick={() => draft && actions.approve(lead, draft)}
            >
              approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!pending}
              aria-expanded={panel === "revise"}
              onClick={() => setPanel(panel === "revise" ? null : "revise")}
            >
              revise
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!draft}
              aria-expanded={panel === "edit"}
              onClick={() => setPanel(panel === "edit" ? null : "edit")}
            >
              edit
            </Button>
            {extraActions}
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={panel === "drop"}
              onClick={() => setPanel(panel === "drop" ? null : "drop")}
            >
              drop
            </Button>
            <span className="ml-auto max-w-full truncate text-xs text-muted-foreground">
              {contactLabel(lead)}
            </span>
          </div>
          <RevisePanel
            open={panel === "revise"}
            onCancel={() => setPanel(null)}
            onSubmit={(note) => {
              if (draft) void actions.revise(draft, note).then(() => setPanel(null));
            }}
          />
          <DropPanel
            open={panel === "drop"}
            onCancel={() => setPanel(null)}
            onSubmit={(reason, note) => {
              setPanel(null);
              actions.drop(lead, reason, note);
            }}
          />
          <div className="mt-2">
            <NotDelivered events={lead.undeliveredEvents} onRetry={actions.retry} />
          </div>
        </div>
      </div>
    </li>
  );
}

// ---------- views ----------

function CardSkeletons() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="loading">
      {[0, 1, 2].map((index) => (
        <div key={index} className="clients-card space-y-3 p-4">
          <div className="clients-skeleton h-4 w-40 rounded" />
          <div className="clients-skeleton h-3 w-64 max-w-full rounded" />
          <div className="clients-skeleton h-28 w-full rounded" />
          <div className="clients-skeleton h-8 w-56 rounded" />
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

function relativeDue(value: string | null, now: Date) {
  if (!value) return { text: "—", overdue: false };
  const day = (date: Date) => Math.floor((date.getTime() + 5.5 * 3600 * 1000) / (24 * 3600 * 1000));
  const diff = day(new Date(value)) - day(now);
  if (diff === 0) return { text: "due today", overdue: false };
  if (diff > 0) return { text: `in ${diff} day${diff === 1 ? "" : "s"}`, overdue: false };
  return { text: `overdue ${-diff}d`, overdue: true };
}

function WaitingView({
  leads,
  onOpenFollowup,
  onRetry,
}: {
  leads: ClientLeadDetail[];
  onOpenFollowup: (leadId: string) => void;
  onRetry: (eventId: string) => void;
}) {
  const { queued, out } = waitingLeads(leads);
  const now = new Date();
  if (queued.length + out.length === 0) return <Empty>nothing out right now.</Empty>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>business</TableHead>
          <TableHead className="hidden sm:table-cell">sent on</TableHead>
          <TableHead>follow-up due</TableHead>
          <TableHead className="hidden sm:table-cell">stage</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queued.map((lead) => (
          <TableRow key={lead.id} data-testid="waiting-row">
            <TableCell className="max-w-[10rem] font-medium">
              <span className="block truncate">{lead.business}</span>
              <NotDelivered events={lead.undeliveredEvents} onRetry={onRetry} />
            </TableCell>
            <TableCell className="hidden sm:table-cell">—</TableCell>
            <TableCell>
              <Badge variant="outline">queued</Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell">approved</TableCell>
          </TableRow>
        ))}
        {out.map((lead) => {
          const followupSent = lead.followupSentAt !== null;
          const due = relativeDue(followupSent ? lead.coldDueAt : lead.followupDueAt, now);
          const ready = latestDraft(lead, ["followup"]);
          return (
            <TableRow key={lead.id} data-testid="waiting-row">
              <TableCell className="max-w-[10rem] font-medium">
                <span className="block truncate">{lead.business}</span>
                <NotDelivered events={lead.undeliveredEvents} onRetry={onRetry} />
              </TableCell>
              <TableCell className="hidden sm:table-cell">{formatDay(lead.firstSentAt)}</TableCell>
              <TableCell>
                <span className={cn("clients-num", due.overdue && "clients-amber")}>
                  {followupSent ? `cold ${due.text}` : due.text}
                </span>
                {ready?.status === "pending" ? (
                  <button
                    type="button"
                    className="ml-2 align-middle"
                    onClick={() => onOpenFollowup(lead.id)}
                  >
                    <Badge variant="secondary">follow-up draft ready</Badge>
                  </button>
                ) : null}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {followupSent ? "follow-up sent" : "first sent"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function MoneyField({
  label,
  value,
  currency,
  onSave,
}: {
  label: string;
  value: number | null;
  currency: string;
  onSave: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const commit = () => {
    const trimmed = text.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0)) return;
    if (next !== value) onSave(next);
  };
  return (
    <label className="block min-w-0 text-xs text-muted-foreground">
      {label} ({currency})
      <Input
        inputMode="decimal"
        className="mt-1"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
    </label>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset aria-label={label} className="inline-flex flex-wrap gap-1">
      {options.map((option) => (
        <Button
          key={option}
          size="xs"
          aria-pressed={value === option}
          variant={value === option ? "default" : "outline"}
          onClick={() => onChange(option)}
        >
          {option.replace("_", " ")}
        </Button>
      ))}
    </fieldset>
  );
}

function DealBlock({
  lead,
  onDeal,
  onWon,
}: {
  lead: ClientLeadDetail;
  onDeal: (deal: Record<string, unknown>) => void;
  onWon: () => void;
}) {
  return (
    <section className="clients-card mb-3 p-4" aria-label="deal">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3>{lead.status === "in_talks" ? "in talks" : "deal"}</h3>
        <label className="text-xs text-muted-foreground">
          currency{" "}
          <select
            className="ml-1 rounded border bg-background px-1 py-0.5 text-xs"
            value={lead.currency}
            onChange={(event) => onDeal({ currency: event.target.value })}
          >
            {["GBP", "USD", "EUR", "INR"].map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <MoneyField
          key={`budgetStated-${lead.budgetStated}`}
          label="budget stated"
          value={lead.budgetStated}
          currency={lead.currency}
          onSave={(value) => onDeal({ budget_stated: value })}
        />
        <MoneyField
          key={`quotedPrice-${lead.quotedPrice}`}
          label="quoted"
          value={lead.quotedPrice}
          currency={lead.currency}
          onSave={(value) => onDeal({ quoted_price: value })}
        />
        <MoneyField
          key={`agreedPrice-${lead.agreedPrice}`}
          label="agreed"
          value={lead.agreedPrice}
          currency={lead.currency}
          onSave={(value) => onDeal({ agreed_price: value })}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">payment</span>
        <Segmented
          label="payment status"
          options={clientPaymentStatuses}
          value={lead.paymentStatus}
          onChange={(value) => onDeal({ payment_status: value })}
        />
        {lead.agreedPrice !== null && lead.status === "in_talks" ? (
          <Button size="sm" className="ml-auto" onClick={onWon}>
            mark won
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function RepliesView({
  leads,
  selectedId,
  onSelect,
  cardProps,
  onHold,
  onNote,
  onDeal,
  onWon,
}: {
  leads: ClientLeadDetail[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  cardProps: (lead: ClientLeadDetail, draft: ClientDraft | null) => Parameters<typeof LeadCard>[0];
  onHold: (lead: ClientLeadDetail) => void;
  onNote: (lead: ClientLeadDetail, body: string) => Promise<void>;
  onDeal: (lead: ClientLeadDetail, deal: Record<string, unknown>) => void;
  onWon: (lead: ClientLeadDetail) => void;
}) {
  if (leads.length === 0) return <Empty>no replies yet.</Empty>;
  const lead = leads.find((item) => item.id === selectedId) ?? null;
  const draft = lead ? pendingDraft(lead, ["reply"]) : null;
  return (
    <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
      <ul className="space-y-1" aria-label="replied leads">
        {leads.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={cn(
                "w-full rounded-md px-3 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                item.id === selectedId && "bg-muted",
              )}
              aria-current={item.id === selectedId}
              onClick={() => onSelect(item.id)}
            >
              <span className="block truncate text-sm font-medium">{item.business}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {statusLabels[item.status]}
                {item.onHold ? " · with you" : ""}
                {pendingDraft(item, ["reply"]) ? " · reply draft ready" : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="min-w-0">
        {!lead ? (
          <Empty>pick a lead.</Empty>
        ) : (
          <>
            <div className="mb-3">
              <LeadHeading lead={lead} />
            </div>
            {lead.status === "in_talks" || lead.status === "replied" ? (
              <DealBlock
                lead={lead}
                onDeal={(deal) => onDeal(lead, deal)}
                onWon={() => onWon(lead)}
              />
            ) : null}
            <ol className="mb-3 space-y-3" aria-label="thread">
              {lead.messages.map((message) => (
                <li key={message.id} data-testid="reply-message">
                  <blockquote className="border-l-2 pl-3 text-sm break-words whitespace-pre-wrap">
                    {message.body}
                  </blockquote>
                  <p className="mt-0.5 pl-3 text-xs text-muted-foreground">
                    {message.direction === "in" ? "they wrote" : "we wrote"} ·{" "}
                    {formatDay(message.receivedAt)}
                  </p>
                  {message.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground" data-testid="reply-summary">
                      {message.summary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
            {lead.onHold ? (
              <HoldNote lead={lead} onNote={onNote} />
            ) : draft ? (
              <ul>
                <LeadCard
                  {...cardProps(lead, draft)}
                  header={false}
                  extraActions={
                    <Button size="sm" variant="outline" onClick={() => onHold(lead)}>
                      bring to me
                    </Button>
                  }
                />
              </ul>
            ) : (
              <>
                <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  client-hunter is drafting
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => onHold(lead)}>
                  bring to me
                </Button>
              </>
            )}
            <div className="mt-2">
              <NotDelivered
                events={lead.undeliveredEvents}
                onRetry={cardProps(lead, null).actions.retry}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HoldNote({
  lead,
  onNote,
}: {
  lead: ClientLeadDetail;
  onNote: (lead: ClientLeadDetail, body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  return (
    <div className="clients-card p-4">
      <p className="text-sm">with you. client-hunter won't draft until you send a note.</p>
      <Textarea
        className="mt-2"
        aria-label="note to client-hunter"
        placeholder="note to client-hunter"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Button
        size="sm"
        className="mt-2"
        disabled={!text.trim()}
        onClick={() => void onNote(lead, text.trim()).then(() => setText(""))}
      >
        send note
      </Button>
    </div>
  );
}

function ProjectCard({
  lead,
  onDeal,
  onTasks,
}: {
  lead: ClientLeadDetail;
  onDeal: (deal: Record<string, unknown>) => Promise<void>;
  onTasks: (tasks: Array<Pick<ClientTask, "text" | "done" | "blocked">>) => Promise<void>;
}) {
  const [tasks, setTasks] = useState(lead.tasks);
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncedTasks, setSyncedTasks] = useState(lead.tasks);
  if (syncedTasks !== lead.tasks) {
    // server data changed: adopt it (render-time sync, no effect)
    setSyncedTasks(lead.tasks);
    setTasks(lead.tasks);
  }

  const save = async (next: ClientTask[]) => {
    const previous = tasks;
    setTasks(next);
    setError(null);
    try {
      await onTasks(next.map(({ text, done, blocked }) => ({ text, done, blocked })));
    } catch (cause) {
      setTasks(previous);
      setError(errorText(cause));
    }
  };
  const deal = async (patch: Record<string, unknown>) => {
    setError(null);
    try {
      await onDeal(patch);
    } catch (cause) {
      setError(errorText(cause));
    }
  };
  const move = (index: number, by: number) => {
    const next = [...tasks];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    void save(next.map((task, position) => ({ ...task, position })));
  };

  return (
    <article className="clients-card p-4" data-testid="project-card" aria-label={lead.business}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="break-words">
          {lead.business}
          {lead.contactName ? ` · ${lead.contactName}` : ""}
        </h3>
        <span className="clients-num text-sm" data-testid="project-money">
          {formatMoney(lead.agreedPrice, lead.currency)} · {lead.paymentStatus?.replace("_", " ")}
        </span>
      </div>
      {lead.need ? <p className="mt-1 text-sm text-muted-foreground">{lead.need}</p> : null}
      {lead.previewUrl ? (
        <a
          className="mt-1 block truncate text-xs underline-offset-2 hover:underline"
          href={lead.previewUrl}
          target="_blank"
          rel="noreferrer"
        >
          preview: {lead.previewUrl.replace(/^https?:\/\//, "")} ↗
        </a>
      ) : null}
      <ul className="mt-3 space-y-1.5" aria-label="checklist">
        {tasks.map((task, index) => (
          <li key={task.id} className="flex items-start gap-2 text-sm" data-testid="task">
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
            {task.blocked ? <Badge variant="outline">blocked</Badge> : null}
            <span className="flex shrink-0">
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
          placeholder="add a task"
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
        />
        <Button size="sm" variant="outline" type="submit" aria-label="add task">
          <Plus />
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Segmented
          label="payment status"
          options={clientPaymentStatuses}
          value={lead.paymentStatus}
          onChange={(value) => void deal({ payment_status: value })}
        />
        <Segmented
          label="delivery status"
          options={clientDeliveryStatuses}
          value={lead.deliveryStatus}
          onChange={(value) =>
            void deal({
              delivery_status: value,
              delivered_at: value === "delivered" ? new Date().toISOString() : null,
            })
          }
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        started {formatDay(lead.startedAt)} · delivered {formatDay(lead.deliveredAt)}
      </p>
      {error ? (
        <p className="clients-red mt-1 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}

function ArchiveView({
  leads,
  onRevive,
  onRetry,
}: {
  leads: ClientLeadDetail[];
  onRevive: (lead: ClientLeadDetail) => void;
  onRetry: (eventId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "cold" | "dropped">("all");
  const rows = leads.filter((lead) => filter === "all" || lead.status === filter);
  return (
    <>
      <fieldset className="mb-3 flex gap-1.5" aria-label="archive filter">
        {(["all", "cold", "dropped"] as const).map((id) => (
          <Button
            key={id}
            size="xs"
            variant={filter === id ? "default" : "outline"}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {id}
          </Button>
        ))}
      </fieldset>
      {rows.length === 0 ? (
        <Empty>nothing archived.</Empty>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((lead) => (
            <li
              key={lead.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
              data-testid="archive-row"
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
                {lead.doNotContact ? (
                  <Lock className="size-3.5 shrink-0" aria-label="do not contact" />
                ) : null}
                <span className="truncate">{lead.business}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {statusLabels[lead.status]}
                {lead.status === "dropped" && lead.dropReason
                  ? ` · ${lead.dropReason === "other" && lead.dropNote ? lead.dropNote : dropReasonLabels[lead.dropReason]}`
                  : ""}
                {lead.doNotContact ? " · do not contact" : ""}
              </span>
              {lead.status === "cold" ? (
                <Button size="xs" variant="outline" onClick={() => onRevive(lead)}>
                  revive
                </Button>
              ) : null}
              <NotDelivered events={lead.undeliveredEvents} onRetry={onRetry} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rows: Array<[string, string]> = [
    ["j / k", "next / previous card"],
    ["a", "approve"],
    ["r", "revise"],
    ["e", "edit"],
    ["d", "drop"],
    ["z", "undo while the toast is visible"],
    ["⌘/ctrl + enter", "save or send in edit / revise"],
    ["esc", "cancel edit / revise"],
    ["1 – 5", "switch views"],
    ["?", "this sheet"],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>keyboard shortcuts</DialogTitle>
          <DialogDescription>inbox and replies, when no text field is focused.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([keys, label]) => (
            <div key={keys} className="contents">
              <dt>
                <Kbd>{keys}</Kbd>
              </dt>
              <dd className="text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

// ---------- main ----------

export function ClientsWorkspace() {
  const queryClient = useQueryClient();
  const board = useClientBoardQuery();
  const reduced = usePrefersReducedMotion();
  const view = useSyncExternalStore(subscribeView, readViewFromUrl, (): ClientView => "inbox");
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [panels, setPanels] = useState<Record<string, CardPanel>>({});
  const [pickedReplyId, setReplyLeadId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fail = useCallback(
    (cause: unknown) => {
      setActionError(errorText(cause));
      if (cause instanceof ClientsApiError && cause.status === 409) {
        void queryClient.invalidateQueries({ queryKey: clientKeys.board });
      }
    },
    [queryClient],
  );
  const undoQueue = useUndoQueue(fail);

  const setView = useCallback((next: ClientView) => {
    setSelected(0);
    const url = new URL(window.location.href);
    if (next === "inbox") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(VIEW_EVENT));
  }, []);

  const data: ClientBoard | undefined = board.data;
  const leads = useMemo(() => data?.leads ?? [], [data]);
  const visible = useMemo(
    () => leads.filter((lead) => !undoQueue.hidden.has(lead.id)),
    [leads, undoQueue.hidden],
  );
  const counts = useMemo(() => viewCounts(visible), [visible]);
  const inbox = useMemo(() => inboxItems(leads), [leads]);
  const replies = useMemo(() => replyLeads(leads), [leads]);
  const shownInbox = inbox.filter((item) => !undoQueue.hidden.has(item.lead.id));
  const shownReplies = replies.filter((lead) => !undoQueue.hidden.has(lead.id));

  const replyLeadId = shownReplies.some((lead) => lead.id === pickedReplyId)
    ? pickedReplyId
    : (shownReplies[0]?.id ?? null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: clientKeys.board });

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setActionError(null);
      try {
        await fn();
      } catch (cause) {
        fail(cause);
        throw cause;
      } finally {
        await queryClient.invalidateQueries({ queryKey: clientKeys.board });
      }
    },
    [fail, queryClient],
  );

  const focusCardAt = (index: number) => {
    requestAnimationFrame(() => {
      const cards = listRef.current?.querySelectorAll<HTMLElement>("[data-card]");
      if (!cards || cards.length === 0) return;
      const target = cards[Math.max(0, Math.min(index, cards.length - 1))];
      target.focus();
    });
  };

  const actions: DraftActions = {
    approve: (lead, draft) => {
      const index = shownInbox.findIndex((item) => item.lead.id === lead.id);
      undoQueue.schedule({
        key: lead.id,
        label: `approved ${lead.business} v${draft.version}`,
        commit: (keepalive) =>
          approveDraftRequest(draft.id, draft.version, draft.bodySha256, keepalive),
      });
      window.setTimeout(() => focusCardAt(index), EXIT_MS + 20);
    },
    revise: (draft, note) => run(() => reviseDraftRequest(draft.id, note)),
    edit: (draft, subject, body) => run(() => editDraftRequest(draft.id, subject, body)),
    drop: (lead, reason, note) => {
      const index = shownInbox.findIndex((item) => item.lead.id === lead.id);
      undoQueue.schedule({
        key: lead.id,
        label: `dropped ${lead.business}`,
        commit: (keepalive) => dropLeadRequest(lead.id, reason, note, keepalive),
      });
      window.setTimeout(() => focusCardAt(index), EXIT_MS + 20);
    },
    retry: (eventId) => void run(() => retryEventRequest(eventId)).catch(() => undefined),
  };

  const cardProps = (
    lead: ClientLeadDetail,
    draft: ClientDraft | null,
    index = 0,
  ): Parameters<typeof LeadCard>[0] => ({
    lead,
    draft,
    cardKey: lead.id,
    selected: view === "inbox" ? index === selected : false,
    exiting: undoQueue.exiting.has(lead.id),
    gone: undoQueue.exiting.has(lead.id),
    panel: panels[lead.id] ?? null,
    setPanel: (panel) => setPanels((current) => ({ ...current, [lead.id]: panel })),
    actions,
    onFocus: () => setSelected(index),
  });

  // keyboard shortcuts
  const stateRef = useRef({ view, selected, shownInbox, shownReplies, replyLeadId });
  useLayoutEffect(() => {
    stateRef.current = { view, selected, shownInbox, shownReplies, replyLeadId };
  });
  const actionsRef = useRef(actions);
  useLayoutEffect(() => {
    actionsRef.current = actions;
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector("[role=dialog]") && event.key !== "?") return;
      const state = stateRef.current;
      const key = event.key;
      if (/^[1-5]$/.test(key)) {
        event.preventDefault();
        setView(clientViews[Number(key) - 1]);
        return;
      }
      if (key === "?") {
        event.preventDefault();
        setSheetOpen((open) => !open);
        return;
      }
      if (key === "z") {
        if (undoQueue.undo()) event.preventDefault();
        return;
      }
      if (state.view !== "inbox" && state.view !== "replies") return;
      let lead: ClientLeadDetail | null = null;
      let draft: ClientDraft | null = null;
      if (state.view === "inbox") {
        const count = state.shownInbox.length;
        if (key === "j" || key === "k") {
          event.preventDefault();
          if (count === 0) return;
          const next = Math.max(0, Math.min(count - 1, state.selected + (key === "j" ? 1 : -1)));
          setSelected(next);
          focusCardAt(next);
          return;
        }
        const item = state.shownInbox[state.selected];
        if (!item) return;
        lead = item.lead;
        draft = item.draft;
      } else {
        const list = state.shownReplies;
        const current = list.findIndex((item) => item.id === state.replyLeadId);
        if (key === "j" || key === "k") {
          event.preventDefault();
          const next =
            list[Math.max(0, Math.min(list.length - 1, current + (key === "j" ? 1 : -1)))];
          if (next) setReplyLeadId(next.id);
          return;
        }
        lead = list[current] ?? null;
        draft = lead ? pendingDraft(lead, ["reply"]) : null;
      }
      if (!lead) return;
      const target = lead;
      const setPanel = (panel: CardPanel) =>
        setPanels((current) => ({ ...current, [target.id]: panel }));
      if (key === "a" && draft?.status === "pending") {
        event.preventDefault();
        actionsRef.current.approve(lead, draft);
      } else if (key === "r" && draft?.status === "pending") {
        event.preventDefault();
        setPanel("revise");
      } else if (key === "e" && draft) {
        event.preventDefault();
        setPanel("edit");
      } else if (key === "d") {
        event.preventDefault();
        setPanel("drop");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setView, undoQueue]);

  const body = () => {
    if (board.isPending) return <CardSkeletons />;
    if (!data) return null;
    switch (view) {
      case "inbox":
        return shownInbox.length === 0 &&
          inbox.every((item) => !undoQueue.exiting.has(item.lead.id)) ? (
          <Empty>nothing to review. client-hunter's next batch lands here.</Empty>
        ) : (
          <ul aria-label="inbox">
            {inbox
              .filter((item) => !undoQueue.hidden.has(item.lead.id))
              .map((item, index) => (
                <LeadCard key={item.lead.id} {...cardProps(item.lead, item.draft, index)} />
              ))}
          </ul>
        );
      case "waiting":
        return (
          <WaitingView
            leads={visible}
            onRetry={actions.retry}
            onOpenFollowup={(leadId) => {
              setView("inbox");
              const index = shownInbox.findIndex((item) => item.lead.id === leadId);
              setSelected(Math.max(0, index));
              focusCardAt(Math.max(0, index));
            }}
          />
        );
      case "replies":
        return (
          <RepliesView
            leads={shownReplies}
            selectedId={replyLeadId}
            onSelect={setReplyLeadId}
            cardProps={(lead, draft) => cardProps(lead, draft)}
            onHold={(lead) => void run(() => holdLeadRequest(lead.id, "")).catch(() => undefined)}
            onNote={(lead, text) => run(() => noteRequest(lead.id, text))}
            onDeal={(lead, deal) =>
              void run(() => dealRequest(lead.id, deal)).catch(() => undefined)
            }
            onWon={(lead) =>
              void run(() => leadActionRequest(lead.id, "won")).catch(() => undefined)
            }
          />
        );
      case "active": {
        const won = activeLeads(visible);
        return won.length === 0 ? (
          <Empty>no active clients yet.</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {won.map((lead) => (
              <ProjectCard
                key={lead.id}
                lead={lead}
                onDeal={async (deal) => {
                  await dealRequest(lead.id, deal);
                  await refresh();
                }}
                onTasks={async (tasks) => {
                  await tasksRequest(lead.id, tasks);
                  await refresh();
                }}
              />
            ))}
          </div>
        );
      }
      case "archive":
        return (
          <ArchiveView
            leads={archiveLeads(visible)}
            onRetry={actions.retry}
            onRevive={(lead) =>
              void run(() => leadActionRequest(lead.id, "revive")).catch(() => undefined)
            }
          />
        );
    }
  };

  return (
    <div className="clients-root pb-24">
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <WorkspacePageHeader
        title="Clients"
        description="Review client-hunter's drafts, follow replies, and track paying clients."
      />
      {data ? <StatsStrip stats={data.stats} reduced={reduced} /> : null}
      <div className="px-4 pt-3 md:px-7">
        <ViewTabs view={view} counts={counts} onChange={setView} />
      </div>
      {board.isError ? (
        <div
          className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:mx-7"
          role="alert"
        >
          <span>couldn't load clients.</span>
          <Button size="xs" variant="ghost" onClick={() => void board.refetch()}>
            retry
          </Button>
        </div>
      ) : null}
      <div
        ref={listRef}
        id="clients-view"
        role="tabpanel"
        aria-labelledby={`clients-tab-${view}`}
        key={view}
        className={cn(
          "clients-view-body px-4 pt-4 md:px-7",
          view === "inbox" && "max-w-[calc(720px+3.5rem)]",
        )}
      >
        {body()}
      </div>
      <div aria-live="polite" aria-atomic="true">
        {undoQueue.pending ? (
          <div className="clients-toast" data-leaving={undoQueue.leaving} data-testid="undo-toast">
            <div className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{undoQueue.pending.label}</span>
              <Button size="xs" variant="outline" onClick={() => undoQueue.undo()}>
                undo <Kbd>z</Kbd>
              </Button>
            </div>
            <div
              key={undoQueue.pending.key + undoQueue.pending.label}
              className="clients-toast-bar"
              style={{ animationDuration: `${UNDO_MS}ms` }}
            />
          </div>
        ) : null}
      </div>
      <ShortcutSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
