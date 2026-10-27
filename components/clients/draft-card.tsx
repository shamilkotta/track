"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ExternalLink, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  categoryLabels,
  clientDropReasons,
  dropReasonLabels,
  type ClientDraft,
  type ClientDropReason,
  type ClientEvent,
  type ClientLeadDetail,
} from "@/lib/clients/domain";
import { cn } from "@/lib/utils";

export type CardPanel = "revise" | "edit" | "drop" | null;

export function formatDay(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function ConfidenceDot({ level }: { level: ClientLeadDetail["emailConfidence"] }) {
  if (!level) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="clients-dot" data-level={level} aria-hidden />
      email: {level}
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
    <p className="clients-fade-in clients-amber text-xs" data-testid="not-delivered">
      {latest.action} not delivered ·{" "}
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

function submitOnModEnter(event: KeyboardEvent, submit: () => void, cancel: () => void) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    submit();
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancel();
  }
}

function Panel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="clients-panel" data-open={open} aria-hidden={!open} inert={!open}>
      <div>{children}</div>
    </div>
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
  const editRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => editRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const keys = (event: KeyboardEvent) =>
    submitOnModEnter(event, () => onSave(subject, body), onCancel);
  return (
    <div className="space-y-2">
      <Input
        aria-label="subject"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        onKeyDown={keys}
      />
      <Textarea
        ref={editRef}
        aria-label="draft body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={keys}
      />
      <div className="flex gap-2">
        <Button size="xs" onClick={() => onSave(subject, body)}>
          save as v{draft.version + 1}
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          cancel
        </Button>
      </div>
    </div>
  );
}

function ClampedBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);
  return (
    <>
      <p
        ref={bodyRef}
        className={cn("mt-1 text-sm break-words whitespace-pre-wrap", !expanded && "clients-clamp")}
      >
        {text}
      </p>
      {overflowing || expanded ? (
        <button
          type="button"
          className="mt-1 text-xs text-muted-foreground underline underline-offset-2"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "show less" : "show all"}
        </button>
      ) : null}
    </>
  );
}

export function DraftBody({
  draft,
  editing,
  onSave,
  onCancel,
}: {
  draft: ClientDraft;
  editing: boolean;
  onSave: (subject: string, body: string) => void;
  onCancel: () => void;
}) {
  const chip =
    draft.version > 1
      ? `v${draft.version} · ${draft.author === "shamil" ? "edited" : "revised"}`
      : "v1";
  return (
    <div
      className="clients-edit mt-3 rounded-md bg-muted/50 p-3"
      data-editing={editing}
      data-testid="draft"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span data-testid="draft-version">draft {chip}</span>
        {draft.status === "revision_requested" ? (
          <Badge variant="outline">revision requested</Badge>
        ) : null}
      </div>
      {editing ? (
        <DraftEditor key={draft.id} draft={draft} onSave={onSave} onCancel={onCancel} />
      ) : (
        <>
          {draft.subject ? (
            <p className="text-sm font-medium break-words">subject: {draft.subject}</p>
          ) : null}
          <ClampedBody text={draft.body} />
        </>
      )}
    </div>
  );
}

export function RevisePanel({
  open,
  label = "send note",
  placeholder = "what should change?",
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
    const frame = requestAnimationFrame(() => ref.current?.focus());
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
      <div className="space-y-2 pt-3">
        <Textarea
          ref={ref}
          aria-label={placeholder}
          placeholder={placeholder}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => submitOnModEnter(event, submit, cancel)}
        />
        <div className="flex gap-2">
          <Button size="xs" onClick={submit} disabled={!note.trim()}>
            {label}
          </Button>
          <Button size="xs" variant="ghost" onClick={cancel}>
            cancel
          </Button>
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
    const frame = requestAnimationFrame(() => firstRef.current?.focus());
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
      <fieldset className="pt-3">
        <legend className="mb-2 pt-3 text-xs text-muted-foreground">why drop it?</legend>
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
                  requestAnimationFrame(() => otherRef.current?.focus());
                } else submit(reason, "");
              }}
            >
              {dropReasonLabels[reason]}
            </Button>
          ))}
          <Button size="xs" variant="ghost" onKeyDown={escape} onClick={cancel}>
            cancel
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
              size="xs"
              disabled={!other.trim()}
              onKeyDown={escape}
              onClick={() => submit("other", other.trim())}
            >
              drop
            </Button>
          </div>
        ) : null}
      </fieldset>
    </Panel>
  );
}

export function LeadHeading({ lead }: { lead: ClientLeadDetail }) {
  const host = (url: string) => {
    try {
      return new URL(url).host.replace(/^www\./, "");
    } catch {
      return url;
    }
  };
  const path = (url: string) => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="flex items-center gap-1.5 break-words">
          {lead.doNotContact ? <Lock className="size-3.5" aria-label="do not contact" /> : null}
          {lead.business}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {lead.region ? <span>{lead.region}</span> : null}
          {lead.category ? <span>· {categoryLabels[lead.category]}</span> : null}
          <ConfidenceDot level={lead.emailConfidence} />
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {lead.siteUrl ? (
          <a
            className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            href={lead.siteUrl}
            target="_blank"
            rel="noreferrer"
          >
            {host(lead.siteUrl)}
          </a>
        ) : null}
        {lead.hookUrl ? (
          <a
            className="inline-flex min-w-0 items-center gap-1 break-all underline-offset-2 hover:underline"
            href={lead.hookUrl}
            target="_blank"
            rel="noreferrer"
          >
            hook: {path(lead.hookUrl)} <ExternalLink className="size-3 shrink-0" aria-hidden />
          </a>
        ) : null}
      </div>
      {lead.need ? <p className="mt-1.5 text-sm break-words">need: {lead.need}</p> : null}
    </div>
  );
}

export function contactLabel(lead: ClientLeadDetail) {
  if (lead.contactChannel === "email") {
    return lead.contactEmail ? `to: ${lead.contactEmail}` : "to: (no email)";
  }
  return `via ${lead.contactChannel}${lead.contactEmail ? ` · ${lead.contactEmail}` : ""}`;
}
