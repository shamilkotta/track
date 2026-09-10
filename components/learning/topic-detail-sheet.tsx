"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DueDateLabel, formatMinutes } from "@/components/learning/shared";
import { ResourceLinesEditor } from "@/components/learning/resource-lines";
import { useLearningMutations } from "@/hooks/use-learning";
import {
  isLearningItemKind,
  learningItemKindLabel,
  learningItemKinds,
  learningItemStatusLabel,
  learningItemStatuses,
  type LearningItem,
  type LearningPathDetail,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

const metaTextClass =
  "inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md px-0.5 text-sm text-muted-foreground transition-colors hover:underline hover:underline-offset-4";

type TopicTab = "notes" | "resources";

function MetaDot() {
  return <span className="size-1 shrink-0 rounded-full bg-muted-foreground/45" aria-hidden />;
}

export function TopicDetailSheet({
  path,
  itemId,
  open,
  onOpenChange,
  onError,
}: {
  path: LearningPathDetail;
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (cause: unknown) => void;
}) {
  const item =
    itemId == null
      ? null
      : (path.modules.flatMap((module) => module.items).find((entry) => entry.id === itemId) ??
        null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-xl"
        showCloseButton
      >
        {open && item ? (
          <TopicPanel
            key={item.id}
            item={item}
            onError={onError}
            onDeleted={() => onOpenChange(false)}
          />
        ) : open ? (
          <SheetHeader className="border-b border-border pr-12">
            <SheetTitle>Topic</SheetTitle>
            <SheetDescription>This topic is no longer available.</SheetDescription>
          </SheetHeader>
        ) : (
          <SheetHeader className="border-b border-border pr-12">
            <SheetTitle>Topic</SheetTitle>
            <SheetDescription className="sr-only">Topic details</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TopicPanel({
  item,
  onError,
  onDeleted,
}: {
  item: LearningItem;
  onError: (cause: unknown) => void;
  onDeleted: () => void;
}) {
  const mutations = useLearningMutations();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [tab, setTab] = useState<TopicTab>("notes");
  const [notesDraft, setNotesDraft] = useState(item.notes);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const displayTitle = titleDraft ?? item.title;

  async function patch(patch: Record<string, unknown>) {
    try {
      await mutations.patchItem.mutateAsync({ id: item.id, patch });
    } catch (cause) {
      onError(cause);
    }
  }

  async function saveTitle() {
    const next = (titleDraft ?? item.title).trim() || item.title;
    setTitleDraft(null);
    if (next === item.title) return;
    await patch({ title: next });
  }

  async function saveNotes() {
    if (notesDraft === item.notes) return;
    await patch({ notes: notesDraft });
  }

  return (
    <>
      <SheetHeader className="space-y-2 border-b border-border pr-12">
        <SheetTitle className="sr-only">{item.title}</SheetTitle>
        <SheetDescription className="sr-only">
          Edit title, kind, due date, duration, notes, and resources.
        </SheetDescription>
        <Input
          value={displayTitle}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={() => void saveTitle()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="h-auto border-0 bg-transparent px-0 py-0 text-xl leading-tight font-semibold tracking-tight shadow-none focus-visible:ring-0"
          aria-label="Topic title"
        />

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button type="button" className={metaTextClass} aria-label="Topic status" />}
            >
              {learningItemStatusLabel(item.status)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-32">
              {learningItemStatuses.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => {
                    if (status === item.status) return;
                    void patch({ status });
                  }}
                >
                  {learningItemStatusLabel(status)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <MetaDot />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button type="button" className={metaTextClass} aria-label="Topic kind" />}
            >
              {learningItemKindLabel(item.kind)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-32">
              {learningItemKinds.map((kind) => (
                <DropdownMenuItem
                  key={kind}
                  onClick={() => {
                    if (!isLearningItemKind(kind) || kind === item.kind) return;
                    void patch({ kind });
                  }}
                >
                  {learningItemKindLabel(kind)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <MetaDot />

          <InlineDateText
            value={item.dueDate}
            emptyLabel="Due date"
            ariaLabel="Due date"
            onChange={(dueDate) => void patch({ dueDate })}
          />

          <MetaDot />

          <DurationPopover
            minutes={item.estimatedMinutes}
            onChange={(estimatedMinutes) => void patch({ estimatedMinutes })}
          />

          <MetaDot />

          <button
            type="button"
            className={cn(metaTextClass, "hover:text-destructive")}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </button>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className="flex items-center gap-1.5 px-4 pt-3"
          role="tablist"
          aria-label="Topic sections"
        >
          <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
            Notes
          </TabButton>
          <TabButton active={tab === "resources"} onClick={() => setTab("resources")}>
            Resources
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === "notes" ? (
            <Textarea
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              onBlur={() => void saveNotes()}
              placeholder="Add notes for this topic…"
              className="min-h-40 resize-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
              aria-label="Topic notes"
            />
          ) : (
            <ResourceLinesEditor
              resources={item.resources}
              pathId={item.pathId}
              itemId={item.id}
              onError={onError}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this topic?"
        description="Notes and resources on this topic will be removed."
        onConfirm={async () => {
          try {
            await mutations.deleteItem.mutateAsync(item.id);
            onDeleted();
          } catch (cause) {
            onError(cause);
            throw cause;
          }
        }}
      />
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm transition-colors",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function InlineDateText({
  value,
  emptyLabel,
  ariaLabel,
  onChange,
}: {
  value: string;
  emptyLabel: string;
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Fall through to click for browsers that block showPicker.
      }
    }
    input.click();
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button type="button" className={metaTextClass} onClick={openPicker} aria-label={ariaLabel}>
        {value ? <DueDateLabel date={value} className="text-sm" /> : emptyLabel}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </span>
  );
}

function DurationPopover({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<"minutes" | "hours">("minutes");
  const amountRef = useRef<HTMLInputElement>(null);

  function hydrateFromMinutes() {
    if (minutes > 0 && minutes % 60 === 0) {
      setAmount(String(minutes / 60));
      setUnit("hours");
    } else {
      setAmount(minutes > 0 ? String(minutes) : "");
      setUnit("minutes");
    }
  }

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function commitAndClose() {
    const next = (Number(amount) || 0) * (unit === "hours" ? 60 : 1);
    setOpen(false);
    if (next !== minutes) onChange(next);
  }

  function clear() {
    setAmount("");
    setUnit("minutes");
    setOpen(false);
    if (minutes !== 0) onChange(0);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          hydrateFromMinutes();
          setOpen(true);
          return;
        }
        commitAndClose();
      }}
    >
      <PopoverTrigger
        render={<button type="button" className={metaTextClass} aria-label="Edit duration" />}
      >
        {minutes > 0 ? formatMinutes(minutes) : "Duration"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>Duration</PopoverTitle>
        </PopoverHeader>
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
          <input
            ref={amountRef}
            type="number"
            min={0}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitAndClose();
              }
            }}
            placeholder="0"
            aria-label="Duration amount"
            className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value as "minutes" | "hours")}
            aria-label="Duration unit"
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={clear}>
            Clear
          </Button>
          <Button type="button" size="sm" onClick={commitAndClose}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
