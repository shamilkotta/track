"use client";

import { useMemo, useState } from "react";
import { LearningItemRow } from "@/components/learning/shared";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { useDueLearningItemsQuery, useLearningMutations } from "@/hooks/use-learning";
import type { LearningItemStatus } from "@/lib/domain";

function isoOffset(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function LearningTodayView() {
  const today = isoOffset(0);
  const weekEnd = isoOffset(7);
  const dueQuery = useDueLearningItemsQuery("0000-01-01", weekEnd);
  const mutations = useLearningMutations();
  const [actionError, setActionError] = useState<string | null>(null);

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  const grouped = useMemo(() => {
    const items = dueQuery.data ?? [];
    return {
      overdue: items.filter((item) => item.dueDate && item.dueDate < today),
      today: items.filter((item) => item.dueDate === today),
      upcoming: items.filter((item) => item.dueDate && item.dueDate > today),
    };
  }, [dueQuery.data, today]);

  if (dueQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader
          title="Today & this week"
          description="What to study now, what slipped, and what is coming up."
        />
        <ListPageSkeleton columns={3} />
      </>
    );
  }

  function renderSection(title: string, items: typeof grouped.today, empty: string) {
    return (
      <section className="mx-4 md:mx-7">
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {items.length === 0 ? (
          <p className="mb-8 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="mb-8 border-y border-border">
            {items.map((item) => (
              <LearningItemRow
                key={item.id}
                item={item}
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
      </section>
    );
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <WorkspacePageHeader
        title="Today & this week"
        description="What to study now, what slipped, and what is coming up."
      />
      {renderSection("Overdue", grouped.overdue, "Nothing overdue.")}
      {renderSection("Today", grouped.today, "Nothing due today — pick an upcoming item or rest.")}
      {renderSection("Rest of the week", grouped.upcoming, "No more due dates this week.")}
    </>
  );
}
