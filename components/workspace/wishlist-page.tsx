"use client";

import { useState, useSyncExternalStore } from "react";
import { WishlistView } from "@/components/wishlist-workspace";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { useWorkspaceFocus } from "@/components/workspace-shell";
import {
  mutateCreateCompany,
  useCompaniesQuery,
  useSavedViewsQuery,
  useWishlistsQuery,
  useWorkspaceMutations,
} from "@/hooks/use-workspace";
import { formValuesToWishlistPatch, type SavedView } from "@/lib/domain";
import {
  readDensity,
  readGroupByCompany,
  subscribeDensity,
  subscribeGroupByCompany,
  writeDensity,
  writeGroupByCompany,
  type Density,
} from "@/lib/workspace-prefs";

export default function WishlistPage() {
  const { focus, setFocus } = useWorkspaceFocus();
  const [actionError, setActionError] = useState<string | null>(null);
  const density = useSyncExternalStore(subscribeDensity, readDensity, (): Density => "comfortable");
  const groupByCompanyEnabled = useSyncExternalStore(
    subscribeGroupByCompany,
    readGroupByCompany,
    () => true,
  );
  const wishlistsQuery = useWishlistsQuery("active");
  const companiesQuery = useCompaniesQuery();
  const viewsQuery = useSavedViewsQuery("wishlist");
  const mutations = useWorkspaceMutations();
  const listPending = wishlistsQuery.isPending || companiesQuery.isPending;

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      {listPending ? (
        <>
          <WorkspacePageHeader
            title="Companies you want to watch"
            description="Contacts, notes, and next steps before an application exists."
          />
          <ListPageSkeleton columns={5} />
        </>
      ) : (
        <WishlistView
          wishlists={wishlistsQuery.data ?? []}
          companies={companiesQuery.data ?? []}
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
          focusId={focus?.kind === "wishlist" ? focus.id : null}
          onFocusConsumed={() => setFocus(null)}
          onPatch={async (id, patch) => {
            try {
              await mutations.patchWishlist.mutateAsync({ id, patch });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDelete={async (id) => {
            try {
              await mutations.deleteWishlist.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
          onBulk={async (ids, action) => {
            try {
              await mutations.bulkWishlists.mutateAsync({ ids, action });
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
          onCreate={async (data) => {
            const patch = formValuesToWishlistPatch(data);
            if (!patch) return;
            try {
              await mutations.createWishlist.mutateAsync(patch);
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
