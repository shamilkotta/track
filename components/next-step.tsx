"use client";

import { useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  appendStepLog,
  formatDisplayDate,
  formatRelativeNextStep,
  nextStepUrgency,
  todayIsoDate,
  type NextStepUrgency,
  type StepLog,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

const urgencyTone: Record<
  Exclude<NextStepUrgency, "none">,
  { cell: string; badge: string; panel: string; label: string }
> = {
  overdue: {
    cell: "text-destructive font-medium",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
    panel: "border-destructive/25 bg-destructive/5",
    label: "Overdue",
  },
  today: {
    cell: "font-medium text-foreground",
    badge: "border-foreground/20 bg-foreground text-background",
    panel: "border-foreground/15 bg-foreground/[0.04]",
    label: "Due today",
  },
  tomorrow: {
    cell: "font-medium text-foreground",
    badge: "border-foreground/15 bg-secondary text-foreground",
    panel: "border-foreground/10 bg-secondary/60",
    label: "Tomorrow",
  },
  later: {
    cell: "text-foreground",
    badge: "border-border bg-transparent text-muted-foreground",
    panel: "border-border bg-transparent",
    label: "Scheduled",
  },
};

export function NextStepCell({
  nextStepDate,
  nextStepLabel,
  className,
}: {
  nextStepDate: string;
  nextStepLabel: string;
  className?: string;
}) {
  const urgency = nextStepUrgency(nextStepDate);
  if (!nextStepDate && !nextStepLabel) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  const relative = nextStepDate ? formatRelativeNextStep(nextStepDate) : null;
  const hot = urgency === "overdue" || urgency === "today" || urgency === "tomorrow";
  const tone = hot ? urgencyTone[urgency] : null;

  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {urgency === "overdue" ? (
        <CircleAlert className="size-3.5 shrink-0 text-destructive" aria-hidden />
      ) : null}
      <span className="min-w-0 truncate">
        {hot && relative ? (
          <>
            <span className={tone?.cell}>{relative}</span>
            {nextStepLabel ? (
              <span className="text-muted-foreground"> · {nextStepLabel}</span>
            ) : null}
          </>
        ) : (
          <>
            {nextStepLabel ? <span className="text-foreground/85">{nextStepLabel}</span> : null}
            {nextStepLabel && relative ? (
              <span className="text-muted-foreground"> · {relative}</span>
            ) : null}
            {!nextStepLabel && relative ? (
              <span className="text-muted-foreground">{relative}</span>
            ) : null}
          </>
        )}
      </span>
    </span>
  );
}

export type StepCompletion = {
  stepLogs: StepLog[];
  nextStepDate: string;
  nextStepLabel: string;
};

export function CurrentNextStepCard({
  nextStepDate,
  nextStepLabel,
  stepLogs,
  readOnly = false,
  onComplete,
}: {
  nextStepDate: string;
  nextStepLabel: string;
  stepLogs: StepLog[];
  readOnly?: boolean;
  onComplete: (patch: StepCompletion) => void;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [scheduleNext, setScheduleNext] = useState(true);
  const [nextDate, setNextDate] = useState("");
  const [nextLabel, setNextLabel] = useState("");
  const urgency = nextStepUrgency(nextStepDate);
  const hasStep = Boolean(nextStepDate || nextStepLabel);
  const tone = hasStep && urgency !== "none" ? urgencyTone[urgency] : urgencyTone.later;
  const headline = !hasStep
    ? "Next step"
    : urgency === "overdue"
      ? "Step overdue"
      : urgency === "today"
        ? "Step due today"
        : urgency === "tomorrow"
          ? "Step tomorrow"
          : "Next step";

  function resetForm() {
    setDetails("");
    setScheduleNext(hasStep);
    setNextDate("");
    setNextLabel("");
    setOpen(false);
  }

  function submit() {
    const label = hasStep ? nextStepLabel.trim() || "Step" : "Step";
    const scheduledDate = scheduleNext ? nextDate : "";
    const scheduledLabel = scheduleNext
      ? nextLabel.trim() || (nextDate ? "Follow up" : "")
      : "";
    const updatedLogs = appendStepLog(stepLogs, {
      label,
      details,
      ...(scheduledDate ? { nextStepDate: scheduledDate } : {}),
      ...(scheduledLabel ? { nextStepLabel: scheduledLabel } : {}),
    });

    if (!hasStep) {
      onComplete({
        stepLogs: updatedLogs,
        nextStepDate: scheduledDate,
        nextStepLabel: scheduledLabel,
      });
      resetForm();
      return;
    }

    onComplete(
      scheduleNext
        ? {
            stepLogs: updatedLogs,
            nextStepDate: scheduledDate,
            nextStepLabel: scheduledLabel,
          }
        : {
            stepLogs: updatedLogs,
            nextStepDate: "",
            nextStepLabel: "",
          },
    );
    resetForm();
  }

  if (readOnly && !hasStep) return null;

  if (!hasStep && !open) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-foreground/15 px-3 py-2.5">
        <p className="text-sm text-muted-foreground">No next step scheduled</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setScheduleNext(false);
            setNextDate("");
            setNextLabel("");
            setDetails("");
            setOpen(true);
          }}
        >
          <Check />
          Log a step
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border px-3 py-3", tone.panel)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{headline}</p>
            {hasStep && (urgency === "overdue" || urgency === "today" || urgency === "tomorrow") ? (
              <Badge variant="outline" className={tone.badge}>
                {tone.label}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasStep
              ? `${nextStepLabel || "Step"}${nextStepDate ? ` · ${formatRelativeNextStep(nextStepDate)}` : ""}`
              : "Record what you did on this opportunity."}
          </p>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            size="sm"
            variant={urgency === "overdue" || urgency === "today" ? "default" : "outline"}
            onClick={() => {
              if (open) {
                resetForm();
                return;
              }
              setScheduleNext(hasStep);
              setNextDate("");
              setNextLabel("");
              setDetails("");
              setOpen(true);
            }}
          >
            <Check />
            {open ? "Cancel" : hasStep ? "Log done" : "Log a step"}
          </Button>
        ) : null}
      </div>

      {open && !readOnly ? (
        <div className="mt-3 grid gap-3 border-t border-foreground/10 pt-3">
          <Field>
            <FieldLabel>What did you do?</FieldLabel>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Sent follow-up email, no reply yet. Asked about timeline."
              rows={3}
            />
          </Field>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={scheduleNext}
              onCheckedChange={(checked) => setScheduleNext(checked === true)}
              aria-label="Schedule the next step"
            />
            <span>Schedule the next step</span>
          </div>
          {scheduleNext ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Next date</FieldLabel>
                <Input
                  type="date"
                  value={nextDate}
                  min={todayIsoDate()}
                  onChange={(e) => setNextDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Next step</FieldLabel>
                <Input
                  value={nextLabel}
                  onChange={(e) => setNextLabel(e.target.value)}
                  placeholder="Follow up again, prep interview…"
                />
              </Field>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submit}>
              Save step
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StepLogHistory({
  stepLogs,
  className,
}: {
  stepLogs: StepLog[];
  className?: string;
}) {
  if (stepLogs.length === 0) return null;

  return (
    <div className={cn("px-4 pb-4", className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Step history
      </p>
      <Accordion className="gap-2">
        {stepLogs.map((log) => {
          const title = log.label.trim() || "Step";
          const subtitle = [
            formatDisplayDate(log.completedAt),
            log.nextStepLabel && log.nextStepDate
              ? `Next: ${log.nextStepLabel} · ${formatRelativeNextStep(log.nextStepDate)}`
              : log.nextStepLabel
                ? `Next: ${log.nextStepLabel}`
                : log.nextStepDate
                  ? `Next: ${formatRelativeNextStep(log.nextStepDate)}`
                  : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <AccordionItem
              key={log.id}
              value={log.id}
              className="rounded-lg border border-foreground/10 not-last:border-b-0"
            >
              <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                <span className="min-w-0 flex-1 pr-2 text-left">
                  <span className="block truncate font-medium">{title}</span>
                  {subtitle ? (
                    <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                      {subtitle}
                    </span>
                  ) : null}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                {log.details ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{log.details}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No details recorded.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

/** @deprecated Use CurrentNextStepCard */
export const NextStepFollowUpCard = CurrentNextStepCard;
