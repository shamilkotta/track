"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PathGoalSheet } from "@/components/learning/path-goal-sheet";
import { PathNotesSheet } from "@/components/learning/path-notes-sheet";
import { TopicDetailSheet } from "@/components/learning/topic-detail-sheet";
import {
  CircularProgress,
  EmptyState,
  DueDateLabel,
  formatMinutes,
} from "@/components/learning/shared";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { NativeSelectField } from "@/components/workspace-fields";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { useWorkspaceFocus } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLearningMutations, useLearningPathQuery } from "@/hooks/use-learning";
import {
  screenPath,
  formatDisplayDate,
  isLearningItemKind,
  learningItemKinds,
  learningItemKindLabel,
  learningPathStatuses,
  learningPathStatusLabel,
  type LearningItem,
  type LearningItemKind,
  type LearningItemStatus,
  type LearningPathDetail,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { useRouter } from "nlite/navigation";

type PathModule = LearningPathDetail["modules"][number];

const pathMetaTextClass =
  "inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md px-0.5 text-sm text-muted-foreground transition-colors hover:underline hover:underline-offset-4";

const moduleMetaTextClass =
  "inline-flex shrink-0 cursor-pointer items-center text-xs text-muted-foreground transition-colors hover:underline hover:underline-offset-4";

function MetaDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("size-1 shrink-0 rounded-full bg-muted-foreground/45", className)}
      aria-hidden
    />
  );
}

export function LearningPathDetailView({ pathId }: { pathId: string }) {
  const router = useRouter();
  const { focus, setFocus } = useWorkspaceFocus();
  const pathQuery = useLearningPathQuery(pathId);
  const mutations = useLearningMutations();
  const [actionError, setActionError] = useState<string | null>(null);

  const [notesOpen, setNotesOpen] = useState(false);
  const [notesModuleId, setNotesModuleId] = useState<string | null>(null);
  const [localTopicItemId, setLocalTopicItemId] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const [itemOpen, setItemOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemKind, setItemKind] = useState<LearningItemKind>("lesson");
  const [itemDue, setItemDue] = useState("");
  const [itemDuration, setItemDuration] = useState("");
  const [itemDurationUnit, setItemDurationUnit] = useState<"minutes" | "hours">("minutes");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  const path = pathQuery.data;
  const displayTitle = titleDraft ?? path?.title ?? "";

  const openModules = useMemo(
    () => path?.modules.map((module) => module.id) ?? [],
    [path?.modules],
  );
  const [expanded, setExpanded] = useState<Set<string> | null>(null);

  const focusTopicId =
    focus?.kind === "learning-topic" && focus.pathId === pathId ? focus.id : null;
  const focusModuleId =
    focus?.kind === "learning-module" && focus.pathId === pathId
      ? focus.id
      : focusTopicId && path
        ? (path.modules.find((module) => module.items.some((item) => item.id === focusTopicId))
            ?.id ?? null)
        : null;

  const topicItemId = localTopicItemId ?? focusTopicId;
  const expandedIds = useMemo(() => {
    const next = new Set(expanded ?? openModules);
    if (focusModuleId) next.add(focusModuleId);
    return next;
  }, [expanded, focusModuleId, openModules]);

  function clearLearningFocus() {
    if (
      focus?.kind === "learning-module" ||
      focus?.kind === "learning-topic" ||
      focus?.kind === "learning-path"
    ) {
      setFocus(null);
    }
  }

  function setTopicItemId(itemId: string | null) {
    clearLearningFocus();
    setLocalTopicItemId(itemId);
  }

  function toggleModule(id: string) {
    clearLearningFocus();
    setExpanded((prev) => {
      const next = new Set(prev ?? openModules);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addModule() {
    if (!path || mutations.createModule.isPending) return;
    try {
      const detail = await mutations.createModule.mutateAsync({
        pathId,
        data: {
          title: `Module ${path.modules.length + 1}`,
          startDate: "",
          endDate: "",
        },
      });
      const created = detail.modules.at(-1);
      if (created) {
        setExpanded((prev) => {
          const next = new Set(prev ?? openModules);
          next.add(created.id);
          return next;
        });
      }
    } catch (cause) {
      fail(cause);
    }
  }

  function openAddItem(module: PathModule) {
    setActiveModuleId(module.id);
    setItemTitle("");
    setItemKind("lesson");
    setItemDue("");
    setItemDuration("");
    setItemDurationUnit("minutes");
    setItemOpen(true);
  }

  async function patchPath(patch: Record<string, unknown>) {
    try {
      await mutations.patchPath.mutateAsync({ id: pathId, patch });
    } catch (cause) {
      fail(cause);
    }
  }

  async function saveTitle() {
    if (!path) return;
    const next = (titleDraft ?? path.title).trim() || path.title;
    setTitleDraft(null);
    if (next === path.title) return;
    await patchPath({ title: next });
  }

  async function patchModule(moduleId: string, patch: Record<string, unknown>) {
    try {
      await mutations.patchModule.mutateAsync({ id: moduleId, patch });
    } catch (cause) {
      fail(cause);
    }
  }

  async function saveItem() {
    if (!activeModuleId) return;
    try {
      await mutations.createItem.mutateAsync({
        moduleId: activeModuleId,
        data: {
          title: itemTitle,
          kind: itemKind,
          dueDate: itemDue,
          estimatedMinutes: (Number(itemDuration) || 0) * (itemDurationUnit === "hours" ? 60 : 1),
        },
      });
      setItemOpen(false);
      setActiveModuleId(null);
    } catch (cause) {
      fail(cause);
    }
  }

  if (pathQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader title="Loading map…" description="" />
        <ListPageSkeleton columns={4} />
      </>
    );
  }

  if (!path) {
    return (
      <EmptyState
        title="Map not found"
        description="This learning map may have been deleted."
        action={
          <Button variant="outline" onClick={() => router.push(screenPath("learning-maps"))}>
            Back to maps
          </Button>
        }
      />
    );
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />

      <div className="track-page-header !pt-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2.5">
            <Input
              value={displayTitle}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              size={Math.max(displayTitle.length + 1, 2)}
              className="field-sizing-content h-auto w-auto max-w-full min-w-[1ch] border-0 bg-transparent px-0 pr-[1ch] text-2xl leading-tight font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-[1.75rem]"
              aria-label="Map title"
            />
            <CircularProgress percent={path.progress.percent} size={20} />
          </div>

          <div className="flex items-center gap-x-2.5 overflow-x-auto whitespace-nowrap">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button type="button" className={pathMetaTextClass} aria-label="Map status" />
                }
              >
                {learningPathStatusLabel(path.status)}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-32">
                {learningPathStatuses.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => {
                      void patchPath({ status });
                    }}
                  >
                    {learningPathStatusLabel(status)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <MetaDot />
            <div className="flex shrink-0 items-center gap-0.5">
              <InlineDateText
                value={path.startDate}
                emptyLabel="Start"
                ariaLabel="Start date"
                max={path.targetEndDate || undefined}
                onChange={(startDate) => {
                  const patch: Record<string, unknown> = { startDate };
                  if (startDate && path.targetEndDate && startDate > path.targetEndDate) {
                    patch.targetEndDate = startDate;
                  }
                  void patchPath(patch);
                }}
              />
              <span className="text-sm text-muted-foreground">→</span>
              <InlineDateText
                value={path.targetEndDate}
                emptyLabel="End"
                ariaLabel="Target end date"
                min={path.startDate || undefined}
                onChange={(targetEndDate) => {
                  const patch: Record<string, unknown> = { targetEndDate };
                  if (targetEndDate && path.startDate && targetEndDate < path.startDate) {
                    patch.startDate = targetEndDate;
                  }
                  void patchPath(patch);
                }}
              />
            </div>
            <MetaDot />
            <span className="inline-flex h-7 shrink-0 items-center text-sm tabular-nums text-muted-foreground">
              {path.progress.doneItems}/{path.progress.totalItems} topics
            </span>
            <MetaDot />
            <button
              type="button"
              className={pathMetaTextClass}
              onClick={() => {
                setNotesModuleId(null);
                setNotesOpen(true);
              }}
            >
              Notes
            </button>
            <MetaDot />
            <button type="button" className={pathMetaTextClass} onClick={() => setGoalOpen(true)}>
              Goal
            </button>
          </div>
        </div>
      </div>

      {path.modules.length === 0 ? (
        <EmptyState
          title="Build your syllabus"
          description="Add a module, then list numbered topics under it."
        />
      ) : (
        <div className="mx-4 md:mx-7">
          <div className="border-t border-border">
            {path.modules.map((module, moduleIndex) => {
              const isOpen = expandedIds.has(module.id);
              return (
                <ModuleSection
                  key={module.id}
                  module={module}
                  moduleIndex={moduleIndex}
                  isOpen={isOpen}
                  onToggle={() => toggleModule(module.id)}
                  onPatch={(patch) => patchModule(module.id, patch)}
                  onAddItem={() => openAddItem(module)}
                  onOpenNotes={() => {
                    setNotesModuleId(module.id);
                    setNotesOpen(true);
                  }}
                  onDelete={() => setDeleteModuleId(module.id)}
                  onItemStatusChange={(itemId, next) => {
                    mutations.patchItem.mutate(
                      { id: itemId, patch: { status: next } },
                      { onError: fail },
                    );
                  }}
                  onOpenItem={(itemId) => setTopicItemId(itemId)}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-4 mt-12 mb-12 flex items-center gap-4 md:mx-7">
        <button
          type="button"
          className={pathMetaTextClass}
          onClick={() => void addModule()}
          disabled={mutations.createModule.isPending}
        >
          Add module
        </button>
        <button
          type="button"
          className={cn(pathMetaTextClass, "hover:text-destructive")}
          onClick={() => setDeleteOpen(true)}
        >
          Delete map
        </button>
      </div>

      <PathNotesSheet
        path={path}
        open={notesOpen}
        moduleId={notesModuleId}
        onOpenChange={(open) => {
          setNotesOpen(open);
          if (!open) setNotesModuleId(null);
        }}
        onError={fail}
      />
      <TopicDetailSheet
        path={path}
        itemId={topicItemId}
        open={topicItemId != null}
        onOpenChange={(open) => {
          if (!open) setTopicItemId(null);
        }}
        onError={fail}
      />
      <PathGoalSheet path={path} open={goalOpen} onOpenChange={setGoalOpen} onError={fail} />

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add topic</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="Read chapter 1 / Build the auth flow"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Kind</FieldLabel>
                <NativeSelectField
                  value={itemKind}
                  onChange={setItemKind}
                  options={learningItemKinds}
                  guard={isLearningItemKind}
                  getLabel={learningItemKindLabel}
                />
              </Field>
              <Field>
                <FieldLabel>Due date</FieldLabel>
                <Input type="date" value={itemDue} onChange={(e) => setItemDue(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Duration</FieldLabel>
              <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={itemDuration}
                  onChange={(e) => setItemDuration(e.target.value)}
                  placeholder="0"
                />
                <NativeSelectField
                  value={itemDurationUnit}
                  onChange={setItemDurationUnit}
                  options={["minutes", "hours"] as const}
                  guard={(value): value is "minutes" | "hours" =>
                    value === "minutes" || value === "hours"
                  }
                  getLabel={(unit) => (unit === "hours" ? "Hours" : "Minutes")}
                  triggerClassName="w-full"
                />
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!itemTitle.trim() || mutations.createItem.isPending}
              onClick={saveItem}
            >
              {`Add ${learningItemKindLabel(itemKind).toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this learning map?"
        description="Modules and topics will be removed."
        onConfirm={async () => {
          await mutations.deletePath.mutateAsync(pathId);
          router.push(screenPath("learning-maps"));
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteModuleId)}
        onOpenChange={(open) => {
          if (!open) setDeleteModuleId(null);
        }}
        title="Remove this module?"
        description="All topics inside it will be deleted."
        onConfirm={async () => {
          if (!deleteModuleId) return;
          await mutations.deleteModule.mutateAsync(deleteModuleId);
          setDeleteModuleId(null);
        }}
      />
    </>
  );
}

function ModuleSection({
  module,
  moduleIndex,
  isOpen,
  onToggle,
  onPatch,
  onAddItem,
  onOpenNotes,
  onDelete,
  onItemStatusChange,
  onOpenItem,
}: {
  module: PathModule;
  moduleIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onAddItem: () => void;
  onOpenNotes: () => void;
  onDelete: () => void;
  onItemStatusChange: (itemId: string, status: LearningItemStatus) => void;
  onOpenItem: (itemId: string) => void;
}) {
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const displayTitle = titleDraft ?? (module.title || `Module ${moduleIndex + 1}`);

  async function saveTitle() {
    const next = (titleDraft ?? module.title).trim() || module.title || `Module ${moduleIndex + 1}`;
    setTitleDraft(null);
    if (next === module.title) return;
    onPatch({ title: next });
  }

  return (
    <section>
      <div className="space-y-1 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Collapse module" : "Expand module"}
          >
            <ChevronDown className={cn("size-4 transition-transform", !isOpen && "-rotate-90")} />
          </button>
          <CircularProgress percent={module.progress.percent} size={16} />
          <Input
            value={displayTitle}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            size={Math.max(displayTitle.length + 1, 2)}
            className="field-sizing-content h-auto w-auto max-w-full min-w-[1ch] border-0 bg-transparent px-0 py-0 pr-[1ch] text-[15px] leading-tight font-medium tracking-tight shadow-none focus-visible:ring-0"
            aria-label="Module title"
          />
        </div>

        <div className="flex h-5 items-center gap-x-2 overflow-x-auto pl-6 whitespace-nowrap sm:pl-9">
          <div className="flex shrink-0 items-center gap-0.5">
            <InlineDateText
              value={module.startDate}
              emptyLabel="Start"
              ariaLabel="Module start date"
              max={module.endDate || undefined}
              className="h-5 text-xs"
              onChange={(startDate) => {
                const patch: Record<string, unknown> = { startDate };
                if (startDate && module.endDate && startDate > module.endDate) {
                  patch.endDate = startDate;
                }
                onPatch(patch);
              }}
            />
            <span className="text-xs text-muted-foreground">→</span>
            <InlineDateText
              value={module.endDate}
              emptyLabel="End"
              ariaLabel="Module end date"
              min={module.startDate || undefined}
              className="h-5 text-xs"
              onChange={(endDate) => {
                const patch: Record<string, unknown> = { endDate };
                if (endDate && module.startDate && endDate < module.startDate) {
                  patch.startDate = endDate;
                }
                onPatch(patch);
              }}
            />
          </div>
          <MetaDot />
          <span className="inline-flex shrink-0 items-center text-xs tabular-nums text-muted-foreground">
            {module.progress.doneItems}/{module.progress.totalItems} topics
          </span>
          <MetaDot />
          <button type="button" className={moduleMetaTextClass} onClick={onOpenNotes}>
            Notes
          </button>
          <MetaDot />
          <button
            type="button"
            className={cn(moduleMetaTextClass, "hover:text-destructive")}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="pb-5 pl-6 sm:pl-9">
          {module.items.length === 0 ? (
            <p className="py-1 text-sm text-muted-foreground">No topics yet.</p>
          ) : (
            <ol className="space-y-0.5">
              {module.items.map((item, itemIndex) => (
                <SyllabusTopicRow
                  key={item.id}
                  index={itemIndex + 1}
                  item={item}
                  onOpen={() => onOpenItem(item.id)}
                  onStatusChange={(next) => onItemStatusChange(item.id, next)}
                />
              ))}
            </ol>
          )}

          <button
            type="button"
            className="mt-2 inline-flex cursor-pointer items-center text-xs text-muted-foreground transition-colors hover:underline hover:underline-offset-4"
            onClick={onAddItem}
          >
            Add topic
          </button>
        </div>
      ) : null}
    </section>
  );
}

function SyllabusTopicRow({
  index,
  item,
  onOpen,
  onStatusChange,
}: {
  index: number;
  item: LearningItem;
  onOpen: () => void;
  onStatusChange: (status: LearningItemStatus) => void;
}) {
  const done = item.status === "done";
  const skipped = item.status === "skipped";
  const meta = [
    learningItemKindLabel(item.kind),
    item.estimatedMinutes ? formatMinutes(item.estimatedMinutes) : null,
    item.status === "in_progress" ? "in progress" : null,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "group flex items-start gap-2 rounded-md py-1.5 pr-1 hover:bg-muted/40",
        (done || skipped) && "opacity-55",
      )}
    >
      <span className="mt-0.5 w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {index}.
      </span>
      <button
        type="button"
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={done ? "Mark as todo" : "Mark as done"}
        onClick={() => onStatusChange(done ? "todo" : "done")}
      >
        {done ? (
          <CheckCircle2 className="size-3.5 text-foreground" />
        ) : (
          <Circle className="size-3.5" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" className="w-full rounded-sm text-left" onClick={onOpen}>
          <span
            className={cn(
              "block text-sm leading-snug",
              done && "text-muted-foreground line-through",
            )}
          >
            {item.title}
          </span>
          {meta.length > 0 || item.dueDate ? (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {meta.map((part) => (
                <span key={part}>{part}</span>
              ))}
              {item.dueDate ? <DueDateLabel date={item.dueDate} /> : null}
            </span>
          ) : null}
        </button>
      </div>
    </li>
  );
}

function InlineDateText({
  value,
  emptyLabel,
  ariaLabel,
  min,
  max,
  className,
  onChange,
}: {
  value: string;
  emptyLabel: string;
  ariaLabel: string;
  min?: string;
  max?: string;
  className?: string;
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
      <button
        type="button"
        className={cn(pathMetaTextClass, className)}
        onClick={openPicker}
        aria-label={ariaLabel}
      >
        {value ? formatDisplayDate(value) : emptyLabel}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </span>
  );
}
