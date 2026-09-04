"use client";

import { useState } from "react";
import { ArchiveView } from "@/components/job-hunt-workspace";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { StackPageSkeleton } from "@/components/workspace-skeletons";
import { useWorkspaceFocus } from "@/components/workspace-shell";
import {
  mutateCreateCompany,
  mutateCreateCoverText,
  mutateUploadCover,
  mutateUploadResume,
  useApplicationsQuery,
  useCompaniesQuery,
  useCoverLettersQuery,
  useLeadsQuery,
  useResumesQuery,
  useWishlistsQuery,
  useWorkspaceMutations,
} from "@/hooks/use-workspace";

export default function ArchivePage() {
  const { focus, setFocus } = useWorkspaceFocus();
  const [actionError, setActionError] = useState<string | null>(null);
  const applicationsQuery = useApplicationsQuery("archived");
  const leadsQuery = useLeadsQuery("archived");
  const wishlistsQuery = useWishlistsQuery("archived");
  const companiesQuery = useCompaniesQuery();
  const resumesQuery = useResumesQuery();
  const coverLettersQuery = useCoverLettersQuery();
  const mutations = useWorkspaceMutations();
  const pending =
    applicationsQuery.isPending ||
    leadsQuery.isPending ||
    wishlistsQuery.isPending ||
    companiesQuery.isPending;

  const focusKind =
    focus?.kind === "application" || focus?.kind === "lead" || focus?.kind === "wishlist"
      ? focus.kind
      : null;

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      {pending ? (
        <div className="px-4 pb-8 pt-7 md:px-7">
          <div className="mb-8">
            <h1>Archive</h1>
            <p className="track-page-lede">
              Closed applications, leads, and wishlist items land here.
            </p>
          </div>
          <StackPageSkeleton rows={8} padded={false} />
        </div>
      ) : (
        <ArchiveView
          applications={applicationsQuery.data ?? []}
          leads={leadsQuery.data ?? []}
          wishlists={wishlistsQuery.data ?? []}
          companies={companiesQuery.data ?? []}
          resumes={resumesQuery.data ?? []}
          coverLetters={coverLettersQuery.data ?? []}
          focusId={focusKind ? (focus?.id ?? null) : null}
          focusKind={focusKind}
          onFocusConsumed={() => setFocus(null)}
          onPatchApplication={async (id, patch) => {
            try {
              await mutations.patchApplication.mutateAsync({ id, patch });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDeleteApplication={async (id) => {
            try {
              await mutations.deleteApplication.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
          onRestoreApplications={async (ids) => {
            try {
              await mutations.bulkApplications.mutateAsync({ ids, action: "unarchive" });
            } catch (cause) {
              fail(cause);
            }
          }}
          onPatchLead={async (id, patch) => {
            try {
              await mutations.patchLead.mutateAsync({ id, patch });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDeleteLead={async (id) => {
            try {
              await mutations.deleteLead.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
          onRestoreLeads={async (ids) => {
            try {
              await mutations.bulkLeads.mutateAsync({ ids, action: "unarchive" });
            } catch (cause) {
              fail(cause);
            }
          }}
          onPatchWishlist={async (id, patch) => {
            try {
              await mutations.patchWishlist.mutateAsync({ id, patch });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDeleteWishlist={async (id) => {
            try {
              await mutations.deleteWishlist.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
          onRestoreWishlists={async (ids) => {
            try {
              await mutations.bulkWishlists.mutateAsync({ ids, action: "unarchive" });
            } catch (cause) {
              fail(cause);
            }
          }}
          onCreateCompany={async (name) => mutateCreateCompany(mutations, name)}
          onUploadResume={async (file) => mutateUploadResume(mutations, file)}
          onCreateCoverText={async (name, body) => mutateCreateCoverText(mutations, name, body)}
          onUploadCover={async (file) => mutateUploadCover(mutations, file)}
        />
      )}
    </>
  );
}
