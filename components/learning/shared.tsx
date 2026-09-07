"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Circle, ExternalLink, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDisplayDate,
  learningItemKindLabel,
  type LearningItem,
  type LearningItemStatus,
  type LearningPathColor,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

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
  dense,
}: {
  item: LearningItem;
  onStatusChange?: (status: LearningItemStatus) => void;
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
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium", done && "line-through")}>{item.title}</p>
          <Badge variant="outline">{learningItemKindLabel(item.kind)}</Badge>
          {item.status === "in_progress" ? <Badge variant="secondary">In progress</Badge> : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.pathTitle ? <span>{item.pathTitle}</span> : null}
          {item.moduleTitle ? <span>{item.moduleTitle}</span> : null}
          {item.dueDate ? <span>Due {formatDisplayDate(item.dueDate)}</span> : null}
          {item.estimatedMinutes ? <span>{formatMinutes(item.estimatedMinutes)}</span> : null}
        </div>
        {item.resources.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.resources.map((resource) =>
              resource.url ? (
                <a
                  key={resource.id}
                  href={resource.url}
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
