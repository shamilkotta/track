"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { ResumesView } from "@/components/job-hunt-workspace";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { StackPageSkeleton } from "@/components/workspace-skeletons";
import { Button } from "@/components/ui/button";
import {
  mutateUploadResume,
  useApplicationsQuery,
  useCompaniesQuery,
  useResumesQuery,
  useWorkspaceMutations,
} from "@/hooks/use-workspace";

export default function ResumesPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const resumesQuery = useResumesQuery();
  const applicationsQuery = useApplicationsQuery("all");
  const companiesQuery = useCompaniesQuery();
  const mutations = useWorkspaceMutations();
  const pending = resumesQuery.isPending || applicationsQuery.isPending || companiesQuery.isPending;

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  async function upload(file: File) {
    try {
      return await mutateUploadResume(mutations, file);
    } catch (cause) {
      fail(cause);
      throw cause;
    }
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      {pending ? (
        <>
          <WorkspacePageHeader
            title="Resumes"
            description="Open any resume to see the file and where it is used."
            actions={
              <Button onClick={() => fileRef.current?.click()}>
                <Upload /> Upload resume
              </Button>
            }
          />
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <StackPageSkeleton />
        </>
      ) : (
        <ResumesView
          resumes={resumesQuery.data ?? []}
          applications={applicationsQuery.data ?? []}
          companies={companiesQuery.data ?? []}
          onUpload={upload}
          onRename={async (id, name) => {
            try {
              await mutations.patchResume.mutateAsync({ id, name });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDelete={async (id) => {
            try {
              await mutations.deleteResume.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
        />
      )}
    </>
  );
}
