"use client";

import { useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  appendFollowUpNote,
  formatRelativeNextStep,
  nextStepUrgency,
  todayIsoDate,
  type NextStepUrgency,
  type ReminderTime,
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

export type FollowUpCompletion = {
  notes: string;
  nextStepDate: string;
  nextStepLabel: string;
  reminderTime: ReminderTime;
};

export function NextStepFollowUpCard({
  nextStepDate,
  nextStepLabel,
  reminderTime,
  notes,
  readOnly = false,
  onComplete,
}: {
  nextStepDate: string;
  nextStepLabel: string;
  reminderTime: ReminderTime;
  notes: string;
  readOnly?: boolean;
  onComplete: (patch: FollowUpCompletion) => void;
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
    ? "Follow-up thread"
    : urgency === "overdue"
      ? "Follow-up overdue"
      : urgency === "today"
        ? "Follow-up due today"
        : urgency === "tomorrow"
          ? "Follow-up tomorrow"
          : "Next follow-up";

  function resetForm() {
    setDetails("");
    setScheduleNext(hasStep);
    setNextDate("");
    setNextLabel("");
    setOpen(false);
  }

  function submit() {
    const label = nextStepLabel.trim() || "Follow-up";
    const updatedNotes = appendFollowUpNote(notes, { label, details });
    if (!hasStep) {
      onComplete({
        notes: updatedNotes,
        nextStepDate: scheduleNext ? nextDate : "",
        nextStepLabel: scheduleNext ? nextLabel.trim() || (nextDate ? "Follow up" : "") : "",
        reminderTime: scheduleNext && nextDate ? reminderTime : "None",
      });
      resetForm();
      return;
    }
    const clearOrSchedule: FollowUpCompletion = scheduleNext
      ? {
          notes: updatedNotes,
          nextStepDate: nextDate,
          nextStepLabel: nextLabel.trim() || (nextDate ? "Follow up" : ""),
          reminderTime: nextDate ? reminderTime : "None",
        }
      : {
          notes: updatedNotes,
          nextStepDate: "",
          nextStepLabel: "",
          reminderTime: "None",
        };
    onComplete(clearOrSchedule);
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
          Log follow-up
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
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {hasStep
              ? `${nextStepLabel || "Follow-up"}${nextStepDate ? ` · ${formatRelativeNextStep(nextStepDate)}` : ""}${reminderTime !== "None" ? ` · ${reminderTime}` : ""}`
              : "Log what you did — it lands in notes on this record."}
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
            {open ? "Cancel" : hasStep ? "Log done" : "Log follow-up"}
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
            <p className="text-xs text-muted-foreground">
              Saved into notes on this record so the thread stays in one place.
            </p>
          </Field>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={scheduleNext}
              onCheckedChange={(checked) => setScheduleNext(checked === true)}
              aria-label="Schedule the next follow-up"
            />
            <span>Schedule the next follow-up</span>
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
              Save to notes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
