"use client";

import { useState } from "react";
import { ResourceLinesEditor } from "@/components/learning/resource-lines";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { useLearningResourcesQuery } from "@/hooks/use-learning";

export function LearningResourcesView() {
  const resourcesQuery = useLearningResourcesQuery();
  const [actionError, setActionError] = useState<string | null>(null);

  if (resourcesQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader
          title="Resources"
          description="Every resource line from topics, plus anything you save here."
        />
        <ListPageSkeleton columns={4} />
      </>
    );
  }

  const resources = resourcesQuery.data ?? [];

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <WorkspacePageHeader
        title="Resources"
        description="Every resource line from topics, plus anything you save here."
      />
      <div className="mx-4 mb-10 md:mx-7">
        <ResourceLinesEditor
          resources={resources}
          onError={(cause) => setActionError(failMessage(cause))}
        />
      </div>
    </>
  );
}
