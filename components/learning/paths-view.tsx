"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState, PathColorDot, CircularProgress } from "@/components/learning/shared";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { NativeSelectField } from "@/components/workspace-fields";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
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
  learningMapPath,
  formatDisplayDate,
  isLearningPathColor,
  isLearningPathStatus,
  learningPathColorLabel,
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
        goal,
        startDate,
        targetEndDate,
        status,
        color,
        firstModuleTitle: "Module 1",
      });
      setCreateOpen(false);
      setTitle("");
      setGoal("");
      setStartDate("");
      setTargetEndDate("");
      router.push(learningMapPath(detail.id));
    } catch (cause) {
      fail(cause);
    }
  }

  if (pathsQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader
          title="Learning maps"
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
        title="Learning maps"
        description="Multi-week and multi-month plans with clear milestones."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New map
          </Button>
        }
      />

      {paths.length === 0 ? (
        <EmptyState
          title="Start your first map"
          description="Break a long skill into modules and track completion over time."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New map
            </Button>
          }
        />
      ) : (
        <div className="mx-4 mb-10 divide-y divide-border border-y border-border md:mx-7">
          {paths.map((path) => {
            const dateLabel =
              path.startDate || path.targetEndDate
                ? [
                    path.startDate ? formatDisplayDate(path.startDate) : "Start",
                    path.targetEndDate ? formatDisplayDate(path.targetEndDate) : "End",
                  ].join(" → ")
                : null;
            const meta = [
              learningPathStatusLabel(path.status),
              dateLabel,
              `${path.moduleCount} module${path.moduleCount === 1 ? "" : "s"}`,
              `${path.progress.totalItems} topic${path.progress.totalItems === 1 ? "" : "s"}`,
            ].filter(Boolean);

            return (
              <button
                key={path.id}
                type="button"
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-5 text-left transition-colors hover:bg-muted/30"
                onClick={() => router.push(learningMapPath(path.id))}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PathColorDot color={path.color} />
                  <h2 className="truncate text-base font-medium">{path.title}</h2>
                </div>
                <p className="text-right text-xs text-muted-foreground">{meta.join(" · ")}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {path.goal.trim() || "No goal yet"}
                </p>
                <div className="flex justify-end">
                  <CircularProgress percent={path.progress.percent} size={22} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New learning map</DialogTitle>
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
                  getLabel={learningPathStatusLabel}
                />
              </Field>
              <Field>
                <FieldLabel>Color</FieldLabel>
                <NativeSelectField
                  value={color}
                  onChange={setColor}
                  options={learningPathColors}
                  guard={isLearningPathColor}
                  getLabel={learningPathColorLabel}
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
