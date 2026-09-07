"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  EmptyState,
  formatMinutes,
  LearningItemRow,
  PathColorDot,
  ProgressBar,
} from "@/components/learning/shared";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { NativeSelectField } from "@/components/workspace-fields";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLearningMutations, useLearningPathQuery } from "@/hooks/use-learning";
import {
  formatDisplayDate,
  isLearningItemKind,
  isLearningPathStatus,
  learningItemKinds,
  learningItemKindLabel,
  learningPathStatuses,
  learningPathStatusLabel,
  type LearningItemKind,
  type LearningItemStatus,
  type LearningPathStatus,
} from "@/lib/domain";
import { useRouter } from "nlite/navigation";

export function LearningPathDetailView({ pathId }: { pathId: string }) {
  const router = useRouter();
  const pathQuery = useLearningPathQuery(pathId);
  const mutations = useLearningMutations();
  const [actionError, setActionError] = useState<string | null>(null);
  const [moduleOpen, setModuleOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleStart, setModuleStart] = useState("");
  const [moduleEnd, setModuleEnd] = useState("");
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemKind, setItemKind] = useState<LearningItemKind>("lesson");
  const [itemDue, setItemDue] = useState("");
  const [itemMinutes, setItemMinutes] = useState("30");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<LearningPathStatus>("active");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  const path = pathQuery.data;

  function openEdit() {
    if (!path) return;
    setEditTitle(path.title);
    setEditGoal(path.goal);
    setEditDescription(path.description);
    setEditStatus(path.status);
    setEditStart(path.startDate);
    setEditEnd(path.targetEndDate);
    setEditOpen(true);
  }

  async function savePath() {
    try {
      await mutations.patchPath.mutateAsync({
        id: pathId,
        patch: {
          title: editTitle,
          goal: editGoal,
          description: editDescription,
          status: editStatus,
          startDate: editStart,
          targetEndDate: editEnd,
        },
      });
      setEditOpen(false);
    } catch (cause) {
      fail(cause);
    }
  }

  async function addModule() {
    try {
      await mutations.createModule.mutateAsync({
        pathId,
        data: {
          title: moduleTitle,
          description: moduleDescription,
          startDate: moduleStart,
          endDate: moduleEnd,
        },
      });
      setModuleOpen(false);
      setModuleTitle("");
      setModuleDescription("");
      setModuleStart("");
      setModuleEnd("");
    } catch (cause) {
      fail(cause);
    }
  }

  async function addItem() {
    if (!activeModuleId) return;
    try {
      await mutations.createItem.mutateAsync({
        moduleId: activeModuleId,
        data: {
          title: itemTitle,
          description: itemDescription,
          kind: itemKind,
          dueDate: itemDue,
          estimatedMinutes: Number(itemMinutes) || 0,
          resourceTitle,
          resourceUrl,
        },
      });
      setItemOpen(false);
      setItemTitle("");
      setItemDescription("");
      setItemKind("lesson");
      setItemDue("");
      setItemMinutes("30");
      setResourceTitle("");
      setResourceUrl("");
      setActiveModuleId(null);
    } catch (cause) {
      fail(cause);
    }
  }

  if (pathQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader title="Loading path…" description="" />
        <ListPageSkeleton columns={4} />
      </>
    );
  }

  if (!path) {
    return (
      <EmptyState
        title="Path not found"
        description="This learning path may have been deleted."
        action={
          <Button variant="outline" onClick={() => router.push("/learning/paths")}>
            Back to paths
          </Button>
        }
      />
    );
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <div className="px-4 pt-4 md:px-7">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => router.push("/learning/paths")}
        >
          <ArrowLeft />
          Paths
        </Button>
      </div>
      <WorkspacePageHeader
        title={path.title}
        description={path.goal || path.description || "Build the path week by week."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openEdit}>
              Edit path
            </Button>
            <Button onClick={() => setModuleOpen(true)}>
              <Plus />
              Add module
            </Button>
          </div>
        }
      />

      <div className="mx-4 mb-6 space-y-4 md:mx-7">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 text-foreground">
            <PathColorDot color={path.color} />
            <Badge variant="outline">{learningPathStatusLabel(path.status)}</Badge>
          </span>
          {path.startDate ? <span>Starts {formatDisplayDate(path.startDate)}</span> : null}
          {path.targetEndDate ? <span>Target {formatDisplayDate(path.targetEndDate)}</span> : null}
          <span>
            {path.progress.doneItems}/{path.progress.totalItems} items · {path.progress.percent}%
          </span>
        </div>
        <ProgressBar percent={path.progress.percent} className="h-2" />
      </div>

      {path.modules.length === 0 ? (
        <EmptyState
          title="No modules yet"
          description="Modules are weeks or phases. Add one, then fill it with lessons, practice, and projects."
          action={
            <Button onClick={() => setModuleOpen(true)}>
              <Plus />
              Add module
            </Button>
          }
        />
      ) : (
        <div className="mx-4 mb-12 md:mx-7">
          <Accordion multiple defaultValue={[path.modules[0]?.id].filter(Boolean) as string[]}>
            {path.modules.map((module, index) => (
              <AccordionItem key={module.id} value={module.id}>
                <AccordionTrigger className="items-center py-4 hover:no-underline">
                  <div className="min-w-0 flex-1 pr-4 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Module {index + 1}
                      </span>
                      <span className="font-medium">{module.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {module.progress.doneItems}/{module.progress.totalItems} ·{" "}
                        {module.progress.percent}%
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {module.startDate || module.endDate
                        ? `${module.startDate ? formatDisplayDate(module.startDate) : "…"} → ${
                            module.endDate ? formatDisplayDate(module.endDate) : "…"
                          }`
                        : "No date range"}
                      {module.description ? ` · ${module.description}` : ""}
                    </div>
                    <ProgressBar percent={module.progress.percent} className="mt-2 max-w-sm" />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pb-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveModuleId(module.id);
                          setItemOpen(true);
                        }}
                      >
                        <Plus />
                        Add item
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => {
                          mutations.deleteModule.mutate(module.id, { onError: fail });
                        }}
                      >
                        <Trash2 />
                        Remove module
                      </Button>
                    </div>
                    {module.items.length === 0 ? (
                      <p className="py-4 text-sm text-muted-foreground">
                        No items yet. Add lessons, practice sessions, or projects with due dates.
                      </p>
                    ) : (
                      module.items.map((item) => (
                        <div key={item.id} className="group relative">
                          <LearningItemRow
                            item={item}
                            onStatusChange={(next: LearningItemStatus) => {
                              mutations.patchItem.mutate(
                                { id: item.id, patch: { status: next } },
                                { onError: fail },
                              );
                            }}
                          />
                          <div className="absolute top-3 right-0 hidden gap-1 group-hover:flex">
                            {item.estimatedMinutes ? (
                              <span className="px-2 text-xs text-muted-foreground">
                                {formatMinutes(item.estimatedMinutes)}
                              </span>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-muted-foreground"
                              onClick={() =>
                                mutations.deleteItem.mutate(item.id, { onError: fail })
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {path.resources.length > 0 ? (
            <section className="mt-10">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Path resources
              </h2>
              <ul className="divide-y divide-border border-y border-border">
                {path.resources.map((resource) => (
                  <li key={resource.id} className="flex items-center gap-3 py-3 text-sm">
                    <Badge variant="outline">{resource.kind}</Badge>
                    {resource.url ? (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {resource.title}
                      </a>
                    ) : (
                      <span className="font-medium">{resource.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-10">
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
              Delete path
            </Button>
          </div>
        </div>
      )}

      <Dialog open={moduleOpen} onOpenChange={setModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add module</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="Week 2 · Networking"
              />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                rows={2}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Start</FieldLabel>
                <Input
                  type="date"
                  value={moduleStart}
                  onChange={(e) => setModuleStart(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>End</FieldLabel>
                <Input
                  type="date"
                  value={moduleEnd}
                  onChange={(e) => setModuleEnd(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!moduleTitle.trim() || mutations.createModule.isPending}
              onClick={addModule}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add learning item</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={2}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Kind</FieldLabel>
                <NativeSelectField
                  value={itemKind}
                  onChange={setItemKind}
                  options={learningItemKinds}
                  guard={isLearningItemKind}
                />
              </Field>
              <Field>
                <FieldLabel>Due</FieldLabel>
                <Input type="date" value={itemDue} onChange={(e) => setItemDue(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Minutes</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={itemMinutes}
                  onChange={(e) => setItemMinutes(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Resource title (optional)</FieldLabel>
              <Input value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Resource URL (optional)</FieldLabel>
              <Input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!itemTitle.trim() || mutations.createItem.isPending}
              onClick={addItem}
            >
              Add {learningItemKindLabel(itemKind).toLowerCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit path</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Goal</FieldLabel>
              <Textarea value={editGoal} onChange={(e) => setEditGoal(e.target.value)} rows={2} />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <NativeSelectField
                value={editStatus}
                onChange={setEditStatus}
                options={learningPathStatuses}
                guard={isLearningPathStatus}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Start</FieldLabel>
                <Input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Target end</FieldLabel>
                <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editTitle.trim() || mutations.patchPath.isPending}
              onClick={savePath}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this learning path?"
        description="Modules, items, and path resources will be removed."
        onConfirm={async () => {
          await mutations.deletePath.mutateAsync(pathId);
          router.push("/learning/paths");
        }}
      />
    </>
  );
}
