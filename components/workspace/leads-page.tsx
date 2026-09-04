"use client";

import { useState, useSyncExternalStore } from "react";
import { LeadsView } from "@/components/leads-workspace";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { useWorkspaceFocus } from "@/components/workspace-shell";
import {
  mutateCreateCompany,
  mutateCreateCoverText,
  mutateUploadCover,
  mutateUploadResume,
  useCompaniesQuery,
  useCoverLettersQuery,
  useLeadsQuery,
  useResumesQuery,
  useSavedViewsQuery,
  useWorkspaceMutations,
} from "@/hooks/use-workspace";
import { formValuesToLeadPatch, type SavedView } from "@/lib/domain";
import {
  readDensity,
  readGroupByCompany,
  subscribeDensity,
  subscribeGroupByCompany,
  writeDensity,
  writeGroupByCompany,
  type Density,
} from "@/lib/workspace-prefs";

export default function LeadsPage() {
  const { focus, setFocus } = useWorkspaceFocus();
  const [actionError, setActionError] = useState<string | null>(null);
  const density = useSyncExternalStore(subscribeDensity, readDensity, (): Density => "comfortable");
  const groupByCompanyEnabled = useSyncExternalStore(
    subscribeGroupByCompany,
    readGroupByCompany,
    () => true,
  );
  const leadsQuery = useLeadsQuery("active");
  const companiesQuery = useCompaniesQuery();
  const resumesQuery = useResumesQuery();
  const coverLettersQuery = useCoverLettersQuery();
  const viewsQuery = useSavedViewsQuery("leads");
  const mutations = useWorkspaceMutations();
  const listPending = leadsQuery.isPending || companiesQuery.isPending;

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      {listPending ? (
        <>
          <WorkspacePageHeader
            title="Who you reached out to"
            description="DMs, cold emails, and outreach threads with a clear next step."
          />
          <ListPageSkeleton columns={6} />
        </>
      ) : (
        <LeadsView
          leads={leadsQuery.data ?? []}
          companies={companiesQuery.data ?? []}
          resumes={resumesQuery.data ?? []}
          coverLetters={coverLettersQuery.data ?? []}
          density={density}
          setDensity={writeDensity}
          groupByCompany={groupByCompanyEnabled}
          setGroupByCompany={writeGroupByCompany}
          savedViews={viewsQuery.data ?? []}
          onSaveView={async (view: Omit<SavedView, "id">) => {
            try {
              await mutations.createView.mutateAsync(view);
            } catch (cause) {
              fail(cause);
            }
          }}
          onDeleteView={async (id) => {
            try {
              await mutations.deleteView.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
          focusId={focus?.kind === "lead" ? focus.id : null}
          onFocusConsumed={() => setFocus(null)}
          onPatch={async (id, patch) => {
            try {
              await mutations.patchLead.mutateAsync({ id, patch });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDelete={async (id) => {
            try {
              await mutations.deleteLead.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
          onBulk={async (ids, action) => {
            try {
              await mutations.bulkLeads.mutateAsync({ ids, action });
            } catch (cause) {
              fail(cause);
            }
          }}
          onCreateCompany={async (name) => {
            try {
              return await mutateCreateCompany(mutations, name);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
          onUploadResume={async (file) => {
            try {
              return await mutateUploadResume(mutations, file);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
          onCreateCoverText={async (name, body) => {
            try {
              return await mutateCreateCoverText(mutations, name, body);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
          onUploadCover={async (file) => {
            try {
              return await mutateUploadCover(mutations, file);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
          onCreate={async (data) => {
            const patch = formValuesToLeadPatch(data);
            if (!patch) return;
            try {
              await mutations.createLead.mutateAsync(patch);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
        />
      )}
    </>
  );
}
