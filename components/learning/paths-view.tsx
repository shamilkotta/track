"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState, PathColorDot, ProgressBar } from "@/components/learning/shared";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { NativeSelectField } from "@/components/workspace-fields";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
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
import { useLearningMutations, useLearningPathsQuery } from "@/hooks/use-learning";
import {
  formatDisplayDate,
  isLearningPathColor,
  isLearningPathStatus,
  learningPathColors,
  learningPathStatuses,
  learningPathStatusLabel,
  type LearningPathColor,
  type LearningPathStatus,
} from "@/lib/domain";
import { useRouter } from "nlite/navigation";

export function LearningPathsView() {
  const router = useRouter();
  const pathsQuery = useLearningPathsQuery("active");
  const mutations = useLearningMutations();
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [status, setStatus] = useState<LearningPathStatus>("active");
  const [color, setColor] = useState<LearningPathColor>("neutral");

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  async function createPath() {
    try {
      const detail = await mutations.createPath.mutateAsync({
        title,
        description,
        goal,
        startDate,
        targetEndDate,
        status,
        color,
        firstModuleTitle: "Week 1",
      });
      setCreateOpen(false);
      router.push(`/learning/paths/${detail.id}`);
    } catch (cause) {
      fail(cause);
    }
  }

  if (pathsQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader
          title="Learning paths"
          description="Multi-week and multi-month plans with clear milestones."
        />
        <ListPageSkeleton columns={5} />
      </>
    );
  }

  const paths = pathsQuery.data ?? [];

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <WorkspacePageHeader
        title="Learning paths"
        description="Multi-week and multi-month plans with clear milestones."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New path
          </Button>
        }
      />

      {paths.length === 0 ? (
        <EmptyState
          title="Start your first path"
          description="Break a long skill into weeks, attach resources, and track completion over time."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New path
            </Button>
          }
        />
      ) : (
        <div className="mx-4 mb-10 divide-y divide-border border-y border-border md:mx-7">
          {paths.map((path) => (
            <button
              key={path.id}
              type="button"
              className="flex w-full flex-col gap-3 py-5 text-left transition-colors hover:bg-muted/30 md:flex-row md:items-center md:gap-6"
              onClick={() => router.push(`/learning/paths/${path.id}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PathColorDot color={path.color} />
                  <h2 className="text-base font-medium">{path.title}</h2>
                  <Badge variant="outline">{learningPathStatusLabel(path.status)}</Badge>
                </div>
                {path.goal || path.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {path.goal || path.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {path.startDate ? `Starts ${formatDisplayDate(path.startDate)}` : "No start date"}
                  {path.targetEndDate ? ` · Target ${formatDisplayDate(path.targetEndDate)}` : ""}
                </p>
              </div>
              <div className="w-full md:w-48">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {path.progress.doneItems}/{path.progress.totalItems}
                  </span>
                  <span className="tabular-nums">{path.progress.percent}%</span>
                </div>
                <ProgressBar percent={path.progress.percent} />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New learning path</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Goal</FieldLabel>
              <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Start</FieldLabel>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Target end</FieldLabel>
                <Input
                  type="date"
                  value={targetEndDate}
                  onChange={(e) => setTargetEndDate(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Status</FieldLabel>
                <NativeSelectField
                  value={status}
                  onChange={setStatus}
                  options={learningPathStatuses}
                  guard={isLearningPathStatus}
                />
              </Field>
              <Field>
                <FieldLabel>Color</FieldLabel>
                <NativeSelectField
                  value={color}
                  onChange={setColor}
                  options={learningPathColors}
                  guard={isLearningPathColor}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!title.trim() || mutations.createPath.isPending} onClick={createPath}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
