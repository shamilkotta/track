"use client";

import { useMemo } from "react";
import { ScheduleEntryRow } from "@/components/learning/shared";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { useWorkspaceFocus } from "@/components/workspace-shell";
import { useLearningScheduleQuery } from "@/hooks/use-learning";
import { learningMapPath, todayIsoDate, type LearningScheduleEntry } from "@/lib/domain";
import { useRouter } from "nlite/navigation";

function isoOffset(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function LearningTodayView() {
  const router = useRouter();
  const { setFocus } = useWorkspaceFocus();
  const today = todayIsoDate();
  const weekEnd = isoOffset(7);
  const scheduleQuery = useLearningScheduleQuery("0000-01-01", weekEnd);

  const grouped = useMemo(() => {
    const entries = scheduleQuery.data ?? [];
    return {
      overdue: entries.filter((entry) => entry.scheduleDate < today),
      today: entries.filter((entry) => entry.scheduleDate === today),
      upcoming: entries.filter((entry) => entry.scheduleDate > today),
    };
  }, [scheduleQuery.data, today]);

  if (scheduleQuery.isPending) {
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

  function openEntry(entry: LearningScheduleEntry) {
    if (entry.kind === "topic" && entry.itemId) {
      setFocus({ kind: "learning-topic", id: entry.itemId, pathId: entry.pathId });
    } else if (entry.kind === "module" && entry.moduleId) {
      setFocus({ kind: "learning-module", id: entry.moduleId, pathId: entry.pathId });
    }
    router.push(learningMapPath(entry.pathId));
  }

  function renderSection(title: string, entries: LearningScheduleEntry[], empty: string) {
    return (
      <section className="mx-4 md:mx-7">
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {entries.length === 0 ? (
          <p className="mb-8 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="mb-8">
            {entries.map((entry) => (
              <ScheduleEntryRow key={entry.id} entry={entry} onOpen={() => openEntry(entry)} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <WorkspacePageHeader
        title="Today & this week"
        description="Topics with due dates first; otherwise modules or maps whose dates are due."
      />
      {renderSection("Overdue", grouped.overdue, "Nothing overdue.")}
      {renderSection("Today", grouped.today, "Nothing due today — pick an upcoming item or rest.")}
      {renderSection("Rest of the week", grouped.upcoming, "No more due dates this week.")}
    </>
  );
}
