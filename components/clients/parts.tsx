"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  categoryLabels,
  clientDropReasons,
  dropReasonLabels,
  formatMoney,
  statusLabels,
  type ClientDraft,
  type ClientDropReason,
  type ClientEvent,
  type ClientLeadDetail,
} from "@/lib/clients/domain";

export type CardPanel = "revise" | "edit" | "drop" | null;

// ---------- formatting ----------

const IST = 5.5 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;

export function formatDay(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

// compact age for list rows: 5m, 3h, 2d, then a date
export function ago(value: string | null, now = Date.now()) {
  if (!value) return "";
  const minutes = Math.round((now - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return formatDay(value);
}

export function relativeDue(value: string | null, now: Date) {
  if (!value) return { text: "—", overdue: false, days: Infinity };
  const day = (date: Date) => Math.floor((date.getTime() + IST) / DAY);
  const days = day(new Date(value)) - day(now);
  if (days === 0) return { text: "due today", overdue: false, days };
  if (days > 0) return { text: `in ${days} day${days === 1 ? "" : "s"}`, overdue: false, days };
  return { text: `overdue ${-days}d`, overdue: true, days };
}

export function host(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function path(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function contactLabel(lead: ClientLeadDetail) {
  if (lead.contactChannel === "email") return lead.contactEmail || "no email yet";
  return `via ${lead.contactChannel}${lead.contactEmail ? ` · ${lead.contactEmail}` : ""}`;
}

export function preview(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

// ---------- small pieces ----------

export function ConfidenceDot({ level }: { level: ClientLeadDetail["emailConfidence"] }) {
  if (!level) return null;
  return (
    <span className="inline-flex items-center gap-1.5" title={`email confidence: ${level}`}>
      <span className="clients-dot" data-level={level} aria-hidden />
      {level}
    </span>
  );
}

export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "amber" | "green";
  children: ReactNode;
}) {
  return (
    <span className="clients-chip" data-tone={tone}>
      {children}
    </span>
  );
}

export function NotDelivered({
  events,
  onRetry,
}: {
  events: ClientEvent[];
  onRetry: (eventId: string) => void;
}) {
  const failed = events.filter((event) => event.attempts > 0);
  if (failed.length === 0) return null;
  const latest = failed.at(-1)!;
  return (
    <p
      className="clients-fade-in clients-amber flex items-center gap-1 text-xs"
      data-testid="not-delivered"
    >
      couldn't reach client-hunter with your {latest.action} ·
      <button
        type="button"
        className="underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onRetry(latest.id)}
      >
        retry
      </button>
    </p>
  );
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
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
    <fieldset aria-label={label} className="clients-segmented">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option.replace("_", " ")}
        </button>
      ))}
    </fieldset>
  );
}

export function MoneyField({
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
      {label}
      <Input
        inputMode="decimal"
        className="clients-num mt-1"
        placeholder={currency}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
    </label>
  );
}

// ---------- lead header ----------

export function LeadHeader({ lead, aside }: { lead: ClientLeadDetail; aside?: ReactNode }) {
  const meta = [
    lead.contactName,
    lead.region,
    lead.category ? categoryLabels[lead.category] : null,
  ].filter(Boolean);
  return (
    <header className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight break-words">
            {lead.doNotContact ? (
              <Lock className="size-4 shrink-0" aria-label="do not contact" />
            ) : null}
            {lead.business}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {meta.map((item, index) => (
              <span key={index}>
                {index > 0 ? <span aria-hidden>· </span> : null}
                {item}
              </span>
            ))}
            {lead.siteUrl ? (
              <a className="clients-link" href={lead.siteUrl} target="_blank" rel="noreferrer">
                {meta.length ? <span aria-hidden>· </span> : null}
                {host(lead.siteUrl)}
              </a>
            ) : null}
          </p>
        </div>
        {aside}
      </div>
      {lead.need || lead.hookUrl ? (
        <div className="mt-4 rounded-lg bg-muted/60 px-4 py-3 text-sm">
          {lead.need ? (
            <p className="break-words">
              <span className="text-muted-foreground">Need · </span>
              {lead.need}
            </p>
          ) : null}
          {lead.hookUrl ? (
            <a
              className="clients-link mt-1 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground"
              href={lead.hookUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span className="truncate">hook: {host(lead.hookUrl) + path(lead.hookUrl)}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

// ---------- the email ----------

function submitOnModEnter(event: KeyboardEvent, submit: () => void, cancel: () => void) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    submit();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancel();
  }
}

export function draftChip(draft: ClientDraft) {
  if (draft.version === 1) return "v1";
  return `v${draft.version} · ${draft.author === "shamil" ? "your edit" : "revised"}`;
}

const kindLabels: Record<ClientDraft["kind"], string> = {
  first: "First email",
  followup: "Follow-up",
  reply: "Reply",
};

export function EmailCard({
  lead,
  draft,
  editing = false,
  onSave,
  onCancel,
  muted = false,
}: {
  lead: ClientLeadDetail;
  draft: ClientDraft;
  editing?: boolean;
  onSave?: (subject: string, body: string) => void;
  onCancel?: () => void;
  muted?: boolean;
}) {
  return (
    <article
      className="clients-email"
      data-editing={editing}
      data-muted={muted}
      data-testid="draft"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{kindLabels[draft.kind]}</span>
        <span className="min-w-0 truncate">to {contactLabel(lead)}</span>
        {lead.contactChannel === "email" ? <ConfidenceDot level={lead.emailConfidence} /> : null}
        <span className="ml-auto" data-testid="draft-version">
          {draftChip(draft)}
        </span>
      </div>
      {editing && onSave && onCancel ? (
        <DraftEditor key={draft.id} draft={draft} onSave={onSave} onCancel={onCancel} />
      ) : (
        <div className="px-4 pt-3 pb-5">
          {draft.subject ? (
            <p className="text-[15px] font-medium break-words">{draft.subject}</p>
          ) : null}
          <p className="mt-2 text-[15px] leading-7 break-words whitespace-pre-wrap">{draft.body}</p>
        </div>
      )}
    </article>
  );
}

function DraftEditor({
  draft,
  onSave,
  onCancel,
}: {
  draft: ClientDraft;
  onSave: (subject: string, body: string) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => bodyRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const keys = (event: KeyboardEvent) =>
    submitOnModEnter(event, () => body.trim() && onSave(subject, body), onCancel);
  return (
    <div className="space-y-2 p-3">
      <Input
        aria-label="subject"
        placeholder="subject"
        className="font-medium"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        onKeyDown={keys}
      />
      <Textarea
        ref={bodyRef}
        aria-label="draft body"
        className="min-h-48 text-[15px] leading-7 md:text-[15px]"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={keys}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!body.trim()} onClick={() => onSave(subject, body)}>
          Save as v{draft.version + 1}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
          ⌘↵ save · esc cancel
        </span>
      </div>
    </div>
  );
}

// ---------- action panels ----------

// Focus into a panel while it is still opening. preventScroll keeps the browser from
// scrolling the panel's clipped (overflow: hidden) box mid-animation; once open,
// bring it into view if it ends below the fold.
const PANEL_MS = 200;
function focusInPanel(target: HTMLElement | null) {
  if (!target) return;
  target.focus({ preventScroll: true });
  window.setTimeout(() => target.scrollIntoView({ block: "nearest" }), PANEL_MS + 20);
}

function Panel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="clients-panel" data-open={open} aria-hidden={!open} inert={!open}>
      <div>{children}</div>
    </div>
  );
}

export function RevisePanel({
  open,
  label = "Send to client-hunter",
  placeholder = "What should change? e.g. shorter, mention their new menu, less salesy",
  onSubmit,
  onCancel,
}: {
  open: boolean;
  label?: string;
  placeholder?: string;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => focusInPanel(ref.current));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const submit = () => {
    if (!note.trim()) return;
    onSubmit(note.trim());
    setNote("");
  };
  const cancel = () => {
    setNote("");
    onCancel();
  };
  return (
    <Panel open={open}>
      <div className="space-y-2 pb-3">
        <Textarea
          ref={ref}
          aria-label="revision note"
          placeholder={placeholder}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => submitOnModEnter(event, submit, cancel)}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={submit} disabled={!note.trim()}>
            {label}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">⌘↵ send</span>
        </div>
      </div>
    </Panel>
  );
}

export function DropPanel({
  open,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onSubmit: (reason: ClientDropReason, note: string) => void;
  onCancel: () => void;
}) {
  const [other, setOther] = useState("");
  const [showOther, setShowOther] = useState(false);
  const firstRef = useRef<HTMLButtonElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => focusInPanel(firstRef.current));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const reset = () => {
    setOther("");
    setShowOther(false);
  };
  const cancel = () => {
    reset();
    onCancel();
  };
  const submit = (reason: ClientDropReason, note: string) => {
    reset();
    onSubmit(reason, note);
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };
  return (
    <Panel open={open}>
      <fieldset className="pb-3">
        <legend className="mb-2 text-xs text-muted-foreground">Why drop it?</legend>
        <div className="flex flex-wrap gap-1.5">
          {clientDropReasons.map((reason, index) => (
            <Button
              key={reason}
              ref={index === 0 ? firstRef : undefined}
              size="xs"
              variant="outline"
              onKeyDown={escape}
              onClick={() => {
                if (reason === "other") {
                  setShowOther(true);
                  requestAnimationFrame(() => focusInPanel(otherRef.current));
                } else submit(reason, "");
              }}
            >
              {dropReasonLabels[reason]}
            </Button>
          ))}
          <Button size="xs" variant="ghost" onKeyDown={escape} onClick={cancel}>
            Cancel
          </Button>
        </div>
        {showOther ? (
          <div className="mt-2 flex gap-2">
            <Input
              ref={otherRef}
              aria-label="other reason"
              placeholder="reason"
              value={other}
              onChange={(event) => setOther(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && other.trim()) submit("other", other.trim());
                else escape(event);
              }}
            />
            <Button
              size="sm"
              disabled={!other.trim()}
              onKeyDown={escape}
              onClick={() => submit("other", other.trim())}
            >
              Drop
            </Button>
          </div>
        ) : null}
      </fieldset>
    </Panel>
  );
}

// ---------- note to client-hunter ----------

export function NoteComposer({
  placeholder = "Message client-hunter about this lead",
  hint,
  onSend,
}: {
  placeholder?: string;
  hint?: string;
  onSend: (body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    onSend(text.trim())
      .then(() => setText(""))
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };
  return (
    <div className="rounded-lg border bg-card p-2 focus-within:border-ring">
      <Textarea
        className="min-h-12 border-0 px-2 shadow-none focus-visible:ring-0"
        aria-label={placeholder}
        placeholder={placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => submitOnModEnter(event, send, () => setText(""))}
      />
      <div className="flex items-center gap-2 px-2 pt-1">
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        <Button size="xs" className="ml-auto" disabled={!text.trim() || busy} onClick={send}>
          Send note
        </Button>
      </div>
    </div>
  );
}

// ---------- deal stage ----------

const stages = ["replied", "in_talks", "won"] as const;

export function StageSteps({ lead }: { lead: ClientLeadDetail }) {
  const at = stages.indexOf(lead.status as (typeof stages)[number]);
  return (
    <ol className="flex items-center gap-1.5 text-xs" aria-label="stage">
      {stages.map((stage, index) => (
        <li key={stage} className="flex items-center gap-1.5">
          {index > 0 ? <span className="h-px w-4 bg-border" aria-hidden /> : null}
          <span
            className="clients-step"
            data-state={index < at ? "done" : index === at ? "current" : "next"}
            aria-current={index === at ? "step" : undefined}
          >
            {index < at ? <Check className="size-3" aria-hidden /> : null}
            {statusLabels[stage]}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ---------- activity ----------

type Entry = {
  key: string;
  at: string;
  who: string;
  text: string;
  body?: string;
};

function activity(lead: ClientLeadDetail): Entry[] {
  const entries: Entry[] = [];
  for (const draft of lead.drafts) {
    entries.push({
      key: draft.id,
      at: draft.createdAt,
      who: draft.author === "shamil" ? "You" : "client-hunter",
      text: `${draft.author === "shamil" ? "edited" : "wrote"} ${kindLabels[draft.kind].toLowerCase()} v${draft.version} · ${draft.status.replace("_", " ")}`,
      body: `${draft.subject ? `${draft.subject}\n\n` : ""}${draft.body}`,
    });
  }
  for (const note of lead.notes) {
    entries.push({
      key: note.id,
      at: note.createdAt,
      who: note.author === "shamil" ? "You" : "client-hunter",
      text: note.author === "shamil" ? "sent a note" : "noted",
      body: note.body,
    });
  }
  for (const message of lead.messages) {
    entries.push({
      key: message.id,
      at: message.receivedAt,
      who: message.direction === "in" ? lead.contactName || lead.business : "Sent",
      text: message.direction === "in" ? "replied" : "email",
      body: message.body,
    });
  }
  const milestones: Array<[string | null, string]> = [
    [lead.firstSentAt, "first email sent"],
    [lead.followupSentAt, "follow-up sent"],
    [lead.coldAt, "went cold"],
    [lead.startedAt, "work started"],
    [lead.deliveredAt, "delivered"],
  ];
  for (const [at, text] of milestones) {
    if (at) entries.push({ key: text, at, who: "", text });
  }
  entries.push({ key: "found", at: lead.createdAt, who: "client-hunter", text: "found this lead" });
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

export function Activity({ lead }: { lead: ClientLeadDetail }) {
  const entries = activity(lead);
  const [all, setAll] = useState(false);
  const shown = all ? entries : entries.slice(0, 6);
  return (
    <>
      <ol className="clients-timeline" aria-label="activity">
        {shown.map((entry) => (
          <li key={entry.key}>
            {entry.body ? (
              <details>
                <summary>
                  <EntryLine entry={entry} />
                </summary>
                <p className="mt-1.5 mb-1 rounded-md bg-muted/60 px-3 py-2 text-[13px] leading-6 break-words whitespace-pre-wrap">
                  {entry.body}
                </p>
              </details>
            ) : (
              <EntryLine entry={entry} />
            )}
          </li>
        ))}
      </ol>
      {entries.length > shown.length ? (
        <button
          type="button"
          className="clients-link mt-2 text-xs text-muted-foreground"
          onClick={() => setAll(true)}
        >
          show {entries.length - shown.length} older
        </button>
      ) : null}
    </>
  );
}

function EntryLine({ entry }: { entry: Entry }) {
  return (
    <span className="flex items-baseline gap-2 text-sm">
      <span className="min-w-0 flex-1">
        {entry.who ? <span className="font-medium">{entry.who} </span> : null}
        <span className="text-muted-foreground">{entry.text}</span>
      </span>
      <span className="clients-num shrink-0 text-xs text-muted-foreground">
        {formatDay(entry.at)}
      </span>
    </span>
  );
}

export function money(lead: ClientLeadDetail) {
  return formatMoney(lead.agreedPrice ?? lead.quotedPrice ?? lead.budgetStated, lead.currency);
}
