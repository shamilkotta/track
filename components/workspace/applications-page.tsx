"use client";

import { useState, useSyncExternalStore } from "react";
import { Plus } from "lucide-react";
import { AddModal, ApplicationsView } from "@/components/job-hunt-workspace";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { useWorkspaceFocus } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  mutateCreateCompany,
  mutateCreateCoverText,
  mutateUploadCover,
  mutateUploadResume,
  useApplicationsQuery,
  useCompaniesQuery,
  useCoverLettersQuery,
  useResumesQuery,
  useSavedViewsQuery,
  useWorkspaceMutations,
} from "@/hooks/use-workspace";
import { formValuesToApplicationPatch, type SavedView } from "@/lib/domain";
import {
  readDensity,
  readGroupByCompany,
  subscribeDensity,
  subscribeGroupByCompany,
  writeDensity,
  writeGroupByCompany,
  type Density,
} from "@/lib/workspace-prefs";

export default function ApplicationsPage() {
  const { focus, setFocus } = useWorkspaceFocus();
  const [modal, setModal] = useState(false);
  const [year, setYear] = useState("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const density = useSyncExternalStore(subscribeDensity, readDensity, (): Density => "comfortable");
  const groupByCompanyEnabled = useSyncExternalStore(
    subscribeGroupByCompany,
    readGroupByCompany,
    () => true,
  );

  const applicationsQuery = useApplicationsQuery("active");
  const companiesQuery = useCompaniesQuery();
  const resumesQuery = useResumesQuery();
  const coverLettersQuery = useCoverLettersQuery();
  const viewsQuery = useSavedViewsQuery("applications");
  const mutations = useWorkspaceMutations();

  const focusId = focus?.kind === "application" ? focus.id : null;
  const listPending = applicationsQuery.isPending || companiesQuery.isPending;

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  async function createCompany(name: string, extra?: { website?: string; location?: string }) {
    return mutateCreateCompany(mutations, name, extra);
  }

  async function uploadResume(file: File) {
    return mutateUploadResume(mutations, file);
  }

  async function createCoverText(name: string, body: string) {
    return mutateCreateCoverText(mutations, name, body);
  }

  async function uploadCover(file: File) {
    return mutateUploadCover(mutations, file);
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      {listPending ? (
        <>
          <WorkspacePageHeader
            title="What needs attention"
            description="Active applications, response rate, and the next dated follow-up."
            actions={
              <Button className="hidden md:inline-flex" onClick={() => setModal(true)}>
                <Plus /> New application
              </Button>
            }
          />
          <ListPageSkeleton columns={5} />
        </>
      ) : (
        <ApplicationsView
          applications={applicationsQuery.data ?? []}
          companies={companiesQuery.data ?? []}
          resumes={resumesQuery.data ?? []}
          coverLetters={coverLettersQuery.data ?? []}
          savedViews={viewsQuery.data ?? []}
          year={year}
          setYear={setYear}
          density={density}
          setDensity={writeDensity}
          groupByCompany={groupByCompanyEnabled}
          setGroupByCompany={writeGroupByCompany}
          focusId={focusId}
          onFocusConsumed={() => setFocus(null)}
          onAdd={() => setModal(true)}
          onPatch={async (id, patch) => {
            try {
              await mutations.patchApplication.mutateAsync({ id, patch });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDelete={async (id) => {
            try {
              await mutations.deleteApplication.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
          onBulk={async (ids, action) => {
            try {
              await mutations.bulkApplications.mutateAsync({ ids, action });
            } catch (cause) {
              fail(cause);
            }
          }}
          onCreateCompany={async (name) => {
            try {
              return await createCompany(name);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
          onUploadResume={async (file) => {
            try {
              return await uploadResume(file);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
          onCreateCoverText={async (name, body) => {
            try {
              return await createCoverText(name, body);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
          onUploadCover={async (file) => {
            try {
              return await uploadCover(file);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
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
          onApplyView={(view) => setYear(view.year)}
        />
      )}
      <AddModal
        open={modal}
        onOpenChange={setModal}
        companies={companiesQuery.data ?? []}
        resumes={resumesQuery.data ?? []}
        coverLetters={coverLettersQuery.data ?? []}
        onCreateCompany={createCompany}
        onUploadResume={uploadResume}
        onCreateCoverText={createCoverText}
        onUploadCover={uploadCover}
        onSave={async (data) => {
          const patch = formValuesToApplicationPatch(data);
          if (!patch) return;
          try {
            await mutations.createApplication.mutateAsync(patch);
          } catch (cause) {
            fail(cause);
            throw cause;
          }
        }}
      />
    </>
  );
}
