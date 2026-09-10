"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Circle, CircleAlert, ExternalLink, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatRelativeNextStep,
  learningItemKindLabel,
  nextStepUrgency,
  type LearningItem,
  type LearningItemStatus,
  type LearningPathColor,
  type LearningScheduleEntry,
  type NextStepUrgency,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

export function dueDateTone(date: string): {
  urgency: NextStepUrgency;
  text: string;
} {
  const urgency = nextStepUrgency(date);
  if (urgency === "overdue") {
    return {
      urgency,
      text: "text-destructive font-medium",
    };
  }
  if (urgency === "today") {
    return {
      urgency,
      text: "font-medium text-foreground",
    };
  }
  if (urgency === "tomorrow") {
    return { urgency, text: "font-medium text-muted-foreground" };
  }
  return { urgency, text: "text-muted-foreground" };
}

export function DueDateLabel({
  date,
  className,
  showIcon = true,
}: {
  date: string;
  className?: string;
  showIcon?: boolean;
}) {
  if (!date) return null;
  const { urgency, text } = dueDateTone(date);
  const relative = formatRelativeNextStep(date);
  const label =
    urgency === "overdue"
      ? relative
      : urgency === "today"
        ? "Due today"
        : urgency === "tomorrow"
          ? "Due tomorrow"
          : `Due ${relative}`;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {showIcon && urgency === "overdue" ? (
        <CircleAlert className="size-3.5 shrink-0 text-destructive" aria-hidden />
      ) : null}
      <span className={text}>{label}</span>
    </span>
  );
}

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <progress
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-foreground [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-foreground",
        className,
      )}
      value={value}
      max={100}
    />
  );
}

export function CircularProgress({
  percent,
  size = 18,
  strokeWidth = 2,
  className,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0 -rotate-90", className)}
      aria-label={`${value}% complete`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="stroke-foreground transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

const pathColorClass: Record<LearningPathColor, string> = {
  neutral: "bg-foreground",
  blue: "bg-sky-600",
  green: "bg-emerald-600",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-600",
};

export function PathColorDot({ color }: { color: LearningPathColor }) {
  return <span className={cn("inline-block size-2.5 rounded-full", pathColorClass[color])} />;
}

export function formatMinutes(minutes: number) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function LearningItemRow({
  item,
  onStatusChange,
  onOpen,
  dense,
}: {
  item: LearningItem;
  onStatusChange?: (status: LearningItemStatus) => void;
  onOpen?: () => void;
  dense?: boolean;
}) {
  const done = item.status === "done";
  const skipped = item.status === "skipped";

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-border/70 py-3 last:border-b-0",
        dense && "py-2.5",
        (done || skipped) && "opacity-60",
      )}
    >
      <button
        type="button"
        className="mt-0.5 text-muted-foreground hover:text-foreground"
        aria-label={done ? "Mark as todo" : "Mark as done"}
        onClick={() => onStatusChange?.(done ? "todo" : "done")}
        disabled={!onStatusChange}
      >
        {done ? (
          <CheckCircle2 className="size-4 text-foreground" />
        ) : skipped ? (
          <SkipForward className="size-4" />
        ) : (
          <Circle className="size-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        {onOpen ? (
          <button
            type="button"
            className="w-full rounded-sm text-left transition-colors hover:text-foreground"
            onClick={onOpen}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn("text-sm font-medium", done && "line-through")}>{item.title}</p>
              <Badge variant="outline">{learningItemKindLabel(item.kind)}</Badge>
              {item.status === "in_progress" ? (
                <Badge variant="secondary">In progress</Badge>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {item.pathTitle ? <span>{item.pathTitle}</span> : null}
              {item.moduleTitle ? <span>{item.moduleTitle}</span> : null}
              {item.dueDate ? <DueDateLabel date={item.dueDate} /> : null}
              {item.estimatedMinutes ? <span>{formatMinutes(item.estimatedMinutes)}</span> : null}
            </div>
          </button>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn("text-sm font-medium", done && "line-through")}>{item.title}</p>
              <Badge variant="outline">{learningItemKindLabel(item.kind)}</Badge>
              {item.status === "in_progress" ? (
                <Badge variant="secondary">In progress</Badge>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {item.pathTitle ? <span>{item.pathTitle}</span> : null}
              {item.moduleTitle ? <span>{item.moduleTitle}</span> : null}
              {item.dueDate ? <DueDateLabel date={item.dueDate} /> : null}
              {item.estimatedMinutes ? <span>{formatMinutes(item.estimatedMinutes)}</span> : null}
            </div>
          </>
        )}
        {item.resources.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.resources.map((resource) =>
              /^https?:\/\//i.test(resource.title) ? (
                <a
                  key={resource.id}
                  href={resource.title}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-foreground underline-offset-2 hover:underline"
                >
                  {resource.title}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <span key={resource.id} className="text-xs text-muted-foreground">
                  {resource.title}
                </span>
              ),
            )}
          </div>
        ) : null}
      </div>
      {onStatusChange && !done ? (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs text-muted-foreground"
          onClick={() => onStatusChange(item.status === "in_progress" ? "todo" : "in_progress")}
        >
          {item.status === "in_progress" ? "Pause" : "Start"}
        </Button>
      ) : null}
    </div>
  );
}

function scheduleKindLabel(kind: LearningScheduleEntry["kind"]) {
  switch (kind) {
    case "topic":
      return "Topic";
    case "module":
      return "Module";
    case "map":
      return "Map";
  }
}

function MetaDot() {
  return <span className="size-1 shrink-0 rounded-full bg-muted-foreground/45" aria-hidden />;
}

export function ScheduleEntryRow({
  entry,
  onOpen,
  dense,
}: {
  entry: LearningScheduleEntry;
  onOpen: () => void;
  dense?: boolean;
}) {
  const done = entry.itemStatus === "done";
  const parts = [
    entry.kind === "topic" && entry.itemKind ? learningItemKindLabel(entry.itemKind) : null,
    entry.kind !== "map" ? entry.pathTitle : null,
    entry.kind === "topic" ? entry.moduleTitle : null,
    entry.estimatedMinutes ? formatMinutes(entry.estimatedMinutes) : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <div className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        className={cn(
          "w-full cursor-pointer rounded-sm px-1 text-left transition-colors hover:bg-muted/40",
          dense ? "py-2.5" : "py-3",
        )}
        onClick={onOpen}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium", done && "line-through")}>{entry.title}</p>
          <Badge variant="outline">{scheduleKindLabel(entry.kind)}</Badge>
          {entry.itemStatus === "in_progress" ? (
            <Badge variant="secondary">In progress</Badge>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {parts.map((part, index) => (
            <span key={part} className="inline-flex items-center gap-x-2">
              {index > 0 ? <MetaDot /> : null}
              <span>{part}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-x-2">
            {parts.length > 0 ? <MetaDot /> : null}
            <DueDateLabel date={entry.scheduleDate} />
          </span>
        </div>
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-4 rounded-xl border border-dashed border-border px-6 py-14 text-center md:mx-7">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
