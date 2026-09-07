"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  EmptyState,
  formatMinutes,
  LearningItemRow,
  PathColorDot,
  ProgressBar,
} from "@/components/learning/shared";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
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
import { NativeSelectField } from "@/components/workspace-fields";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { useLearningMutations, useLearningOverviewQuery } from "@/hooks/use-learning";
import {
  isLearningPathStatus,
  learningPathStatuses,
  learningPathStatusLabel,
  type LearningItemStatus,
  type LearningPathStatus,
} from "@/lib/domain";
import { useRouter } from "nlite/navigation";

export function LearningOverviewView() {
  const router = useRouter();
  const overviewQuery = useLearningOverviewQuery();
  const mutations = useLearningMutations();
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [status, setStatus] = useState<LearningPathStatus>("active");

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
        firstModuleTitle: "Week 1",
      });
      setCreateOpen(false);
      setTitle("");
      setGoal("");
      setStartDate("");
      setTargetEndDate("");
      setStatus("active");
      router.push(`/learning/paths/${detail.id}`);
    } catch (cause) {
      fail(cause);
    }
  }

  if (overviewQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader
          title="Learning overview"
          description="Progress across long paths, what is due next, and your streak."
        />
        <ListPageSkeleton columns={4} />
      </>
    );
  }

  const data = overviewQuery.data;

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <WorkspacePageHeader
        title="Learning overview"
        description="Progress across long paths, what is due next, and your streak."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New path
          </Button>
        }
      />

      <div className="track-stat-strip mx-4 md:mx-7">
        <div>
          <p className="track-stat-label">Active paths</p>
          <p className="track-stat-value">{data?.paths.length ?? 0}</p>
        </div>
        <div>
          <p className="track-stat-label">Done this week</p>
          <p className="track-stat-value">{data?.completedThisWeek ?? 0}</p>
        </div>
        <div>
          <p className="track-stat-label">Time remaining</p>
          <p className="track-stat-value">{formatMinutes(data?.activeMinutesRemaining ?? 0)}</p>
          <p className="track-stat-detail">Estimated on open items</p>
        </div>
        <div>
          <p className="track-stat-label">Journal streak</p>
          <p className="track-stat-value">{data?.journalStreakDays ?? 0}</p>
          <p className="track-stat-detail">Consecutive days</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 px-4 pb-10 md:grid-cols-2 md:px-7">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Paths
            </h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/learning/paths")}>
              View all
            </Button>
          </div>
          {(data?.paths.length ?? 0) === 0 ? (
            <EmptyState
              title="No learning paths yet"
              description="Create a multi-week path with modules, due dates, and resources."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus />
                  Create path
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {data?.paths.map((path) => (
                <button
                  key={path.id}
                  type="button"
                  className="flex w-full flex-col gap-2 py-4 text-left hover:bg-muted/40"
                  onClick={() => router.push(`/learning/paths/${path.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <PathColorDot color={path.color} />
                    <span className="text-sm font-medium">{path.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {learningPathStatusLabel(path.status)}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {path.progress.percent}%
                    </span>
                  </div>
                  <ProgressBar percent={path.progress.percent} />
                  <p className="text-xs text-muted-foreground">
                    {path.progress.doneItems}/{path.progress.totalItems} items
                    {path.targetEndDate ? ` · target ${path.targetEndDate}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Overdue
              </h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/learning/today")}>
                Today
              </Button>
            </div>
            {(data?.overdue.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing overdue. Nice.</p>
            ) : (
              <div>
                {data?.overdue.map((item) => (
                  <LearningItemRow
                    key={item.id}
                    item={item}
                    dense
                    onStatusChange={(next: LearningItemStatus) => {
                      mutations.patchItem.mutate(
                        { id: item.id, patch: { status: next } },
                        { onError: fail },
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Due this week
            </h2>
            {(data?.dueSoon.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming due dates this week.</p>
            ) : (
              <div>
                {data?.dueSoon.map((item) => (
                  <LearningItemRow
                    key={item.id}
                    item={item}
                    dense
                    onStatusChange={(next: LearningItemStatus) => {
                      mutations.patchItem.mutate(
                        { id: item.id, patch: { status: next } },
                        { onError: fail },
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New learning path</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. System design deep dive"
              />
            </Field>
            <Field>
              <FieldLabel>Goal</FieldLabel>
              <Textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="What does done look like?"
                rows={3}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Start date</FieldLabel>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Target end</FieldLabel>
                <Input
                  type="date"
                  value={targetEndDate}
                  onChange={(event) => setTargetEndDate(event.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <NativeSelectField
                value={status}
                onChange={setStatus}
                options={learningPathStatuses}
                guard={isLearningPathStatus}
              />
            </Field>
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
