"use client";

import { useState } from "react";
import { useRouter } from "nlite/navigation";
import { CompaniesView } from "@/components/job-hunt-workspace";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { CardsPageSkeleton } from "@/components/workspace-skeletons";
import { useWorkspaceFocus } from "@/components/workspace-shell";
import {
  mutateCreateCompany,
  useApplicationsQuery,
  useCompaniesQuery,
  useLeadsQuery,
  useWorkspaceMutations,
} from "@/hooks/use-workspace";
import { screenPath } from "@/lib/domain";

export default function CompaniesPage() {
  const router = useRouter();
  const { focus, setFocus } = useWorkspaceFocus();
  const [actionError, setActionError] = useState<string | null>(null);
  const companiesQuery = useCompaniesQuery();
  const applicationsQuery = useApplicationsQuery("active");
  const leadsQuery = useLeadsQuery("active");
  const mutations = useWorkspaceMutations();
  const pending = companiesQuery.isPending || applicationsQuery.isPending || leadsQuery.isPending;

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      {pending ? (
        <>
          <WorkspacePageHeader
            title="Companies"
            description="Shared across applications and leads. Related entries are grouped here."
          />
          <CardsPageSkeleton />
        </>
      ) : (
        <CompaniesView
          companies={companiesQuery.data ?? []}
          applications={applicationsQuery.data ?? []}
          leads={leadsQuery.data ?? []}
          focusId={focus?.kind === "company" ? focus.id : null}
          onFocusConsumed={() => setFocus(null)}
          onCreate={async (name, extra) => {
            try {
              return await mutateCreateCompany(mutations, name, extra);
            } catch (cause) {
              fail(cause);
              throw cause;
            }
          }}
          onPatch={async (id, patch) => {
            try {
              await mutations.patchCompany.mutateAsync({ id, patch });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDelete={async (id) => {
            try {
              await mutations.deleteCompany.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
          onOpenApplication={(id) => {
            setFocus({ kind: "application", id });
            router.push(screenPath("applications"));
          }}
          onOpenLead={(id) => {
            setFocus({ kind: "lead", id });
            router.push(screenPath("leads"));
          }}
        />
      )}
    </>
  );
}
