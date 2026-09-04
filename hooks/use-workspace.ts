"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Application,
  ApplicationListItem,
  ArchiveScope,
  CoverLetter,
  CoverLetterListItem,
  Lead,
  LeadListItem,
  SavedView,
  SavedViewScreen,
  Wishlist,
  WishlistListItem,
} from "@/lib/domain";
import {
  bulkApplicationsRequest,
  bulkLeadsRequest,
  bulkWishlistsRequest,
  createApplicationRequest,
  createCompanyRequest,
  createCoverTextRequest,
  createLeadRequest,
  createViewRequest,
  createWishlistRequest,
  deleteApplicationRequest,
  deleteCompanyRequest,
  deleteCoverRequest,
  deleteLeadRequest,
  deleteResumeRequest,
  deleteViewRequest,
  deleteWishlistRequest,
  fetchApplication,
  fetchApplications,
  fetchCompanies,
  fetchCoverLetter,
  fetchCoverLetters,
  fetchLead,
  fetchLeads,
  fetchResumes,
  fetchSavedViews,
  fetchWishlist,
  fetchWishlists,
  fetchWorkspaceSummary,
  patchApplicationRequest,
  patchCompanyRequest,
  patchCoverRequest,
  patchLeadRequest,
  patchResumeRequest,
  patchWishlistRequest,
  uploadCoverRequest,
  uploadResumeRequest,
} from "@/lib/workspace-api";

export const queryKeys = {
  summary: ["workspace", "summary"] as const,
  companies: ["companies"] as const,
  resumes: ["resumes"] as const,
  coverLetters: ["cover-letters"] as const,
  coverLetter: (id: string) => ["cover-letters", id] as const,
  applications: (scope: ArchiveScope) => ["applications", "list", scope] as const,
  application: (id: string) => ["applications", id] as const,
  leads: (scope: ArchiveScope) => ["leads", "list", scope] as const,
  lead: (id: string) => ["leads", id] as const,
  wishlists: (scope: ArchiveScope) => ["wishlists", "list", scope] as const,
  wishlist: (id: string) => ["wishlists", id] as const,
  views: (screen?: SavedViewScreen) =>
    screen ? (["views", screen] as const) : (["views"] as const),
};

function toApplicationListItem(item: Application): ApplicationListItem {
  return {
    id: item.id,
    companyId: item.companyId,
    role: item.role,
    source: item.source,
    location: item.location,
    workMode: item.workMode,
    stage: item.stage,
    priority: item.priority,
    replyStatus: item.replyStatus,
    appliedDate: item.appliedDate,
    nextStepDate: item.nextStepDate,
    nextStepLabel: item.nextStepLabel,
    reminderTime: item.reminderTime,
    resumeId: item.resumeId,
    coverLetterId: item.coverLetterId,
    tags: item.tags,
    archived: item.archived,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toLeadListItem(item: Lead): LeadListItem {
  return {
    id: item.id,
    companyId: item.companyId,
    personName: item.personName,
    personRole: item.personRole,
    platform: item.platform,
    status: item.status,
    priority: item.priority,
    sentDate: item.sentDate,
    nextStepDate: item.nextStepDate,
    nextStepLabel: item.nextStepLabel,
    reminderTime: item.reminderTime,
    resumeId: item.resumeId,
    coverLetterId: item.coverLetterId,
    tags: item.tags,
    archived: item.archived,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toWishlistListItem(item: Wishlist): WishlistListItem {
  return {
    id: item.id,
    companyId: item.companyId,
    interest: item.interest,
    status: item.status,
    priority: item.priority,
    nextStepDate: item.nextStepDate,
    nextStepLabel: item.nextStepLabel,
    reminderTime: item.reminderTime,
    tags: item.tags,
    archived: item.archived,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    contacts: item.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      role: contact.role,
    })),
  };
}

function toCoverLetterListItem(letter: CoverLetter): CoverLetterListItem {
  if (letter.kind === "file") {
    return { id: letter.id, name: letter.name, kind: "file", fileName: letter.fileName };
  }
  return { id: letter.id, name: letter.name, kind: "text" };
}

function upsertListItem<T extends { id: string }>(list: T[] | undefined, item: T) {
  const prev = list ?? [];
  const index = prev.findIndex((entry) => entry.id === item.id);
  if (index === -1) return [item, ...prev];
  const next = [...prev];
  next[index] = item;
  return next;
}

function removeListItems<T extends { id: string }>(list: T[] | undefined, ids: string[]) {
  return (list ?? []).filter((item) => !ids.includes(item.id));
}

export function useWorkspaceSummary(initialUser?: {
  id: string;
  name: string;
  email: string;
  image: string | null;
  title: string;
}) {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: fetchWorkspaceSummary,
    placeholderData: initialUser
      ? {
          user: initialUser,
          counts: { applications: 0, leads: 0, wishlists: 0 },
          search: { applications: [], leads: [], wishlists: [], companies: [] },
        }
      : undefined,
  });
}

export function useCompaniesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: fetchCompanies,
    enabled,
  });
}

export function useResumesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.resumes,
    queryFn: fetchResumes,
    enabled,
  });
}

export function useCoverLettersQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.coverLetters,
    queryFn: fetchCoverLetters,
    enabled,
  });
}

export function useCoverLetterQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.coverLetter(id ?? ""),
    queryFn: () => fetchCoverLetter(id!),
    enabled: !!id,
  });
}

export function useApplicationsQuery(scope: ArchiveScope, enabled = true) {
  return useQuery({
    queryKey: queryKeys.applications(scope),
    queryFn: () => fetchApplications(scope),
    enabled,
  });
}

export function useApplicationQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.application(id ?? ""),
    queryFn: () => fetchApplication(id!),
    enabled: !!id,
  });
}

export function useLeadsQuery(scope: ArchiveScope, enabled = true) {
  return useQuery({
    queryKey: queryKeys.leads(scope),
    queryFn: () => fetchLeads(scope),
    enabled,
  });
}

export function useLeadQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.lead(id ?? ""),
    queryFn: () => fetchLead(id!),
    enabled: !!id,
  });
}

export function useWishlistsQuery(scope: ArchiveScope, enabled = true) {
  return useQuery({
    queryKey: queryKeys.wishlists(scope),
    queryFn: () => fetchWishlists(scope),
    enabled,
  });
}

export function useWishlistQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.wishlist(id ?? ""),
    queryFn: () => fetchWishlist(id!),
    enabled: !!id,
  });
}

export function useSavedViewsQuery(screen: SavedViewScreen | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.views(screen),
    queryFn: () => fetchSavedViews(screen),
    enabled: enabled && !!screen,
  });
}

export function useWorkspaceMutations() {
  const queryClient = useQueryClient();

  function invalidateSummary() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
  }

  function syncApplication(item: Application) {
    const listItem = toApplicationListItem(item);
    queryClient.setQueryData(queryKeys.application(item.id), item);
    for (const scope of ["active", "archived", "all"] as const) {
      queryClient.setQueryData<ApplicationListItem[]>(queryKeys.applications(scope), (prev) => {
        if (!prev) return prev;
        if (scope === "active" && item.archived) return removeListItems(prev, [item.id]);
        if (scope === "archived" && !item.archived) return removeListItems(prev, [item.id]);
        if (scope === "active" && !item.archived) return upsertListItem(prev, listItem);
        if (scope === "archived" && item.archived) return upsertListItem(prev, listItem);
        return upsertListItem(prev, listItem);
      });
    }
  }

  function syncLead(item: Lead) {
    const listItem = toLeadListItem(item);
    queryClient.setQueryData(queryKeys.lead(item.id), item);
    for (const scope of ["active", "archived", "all"] as const) {
      queryClient.setQueryData<LeadListItem[]>(queryKeys.leads(scope), (prev) => {
        if (!prev) return prev;
        if (scope === "active" && item.archived) return removeListItems(prev, [item.id]);
        if (scope === "archived" && !item.archived) return removeListItems(prev, [item.id]);
        if (scope === "active" && !item.archived) return upsertListItem(prev, listItem);
        if (scope === "archived" && item.archived) return upsertListItem(prev, listItem);
        return upsertListItem(prev, listItem);
      });
    }
  }

  function syncWishlist(item: Wishlist) {
    const listItem = toWishlistListItem(item);
    queryClient.setQueryData(queryKeys.wishlist(item.id), item);
    for (const scope of ["active", "archived", "all"] as const) {
      queryClient.setQueryData<WishlistListItem[]>(queryKeys.wishlists(scope), (prev) => {
        if (!prev) return prev;
        if (scope === "active" && item.archived) return removeListItems(prev, [item.id]);
        if (scope === "archived" && !item.archived) return removeListItems(prev, [item.id]);
        if (scope === "active" && !item.archived) return upsertListItem(prev, listItem);
        if (scope === "archived" && item.archived) return upsertListItem(prev, listItem);
        return upsertListItem(prev, listItem);
      });
    }
  }

  const createCompany = useMutation({
    mutationFn: ({
      name,
      extra,
    }: {
      name: string;
      extra?: { website?: string; location?: string };
    }) => createCompanyRequest(name, extra),
    onSuccess: (company) => {
      queryClient.setQueryData(queryKeys.companies, (prev: (typeof company)[] | undefined) =>
        upsertListItem(prev, company),
      );
      invalidateSummary();
    },
  });

  const patchCompany = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      patchCompanyRequest(id, patch),
    onSuccess: (company) => {
      queryClient.setQueryData(queryKeys.companies, (prev: (typeof company)[] | undefined) =>
        upsertListItem(prev, company),
      );
      invalidateSummary();
    },
  });

  const deleteCompany = useMutation({
    mutationFn: (id: string) => deleteCompanyRequest(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData(queryKeys.companies, (prev: { id: string }[] | undefined) =>
        removeListItems(prev, [id]),
      );
      invalidateSummary();
    },
  });

  const uploadResume = useMutation({
    mutationFn: (file: File) => uploadResumeRequest(file),
    onSuccess: (resume) => {
      queryClient.setQueryData(queryKeys.resumes, (prev: (typeof resume)[] | undefined) =>
        upsertListItem(prev, resume),
      );
    },
  });

  const patchResume = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => patchResumeRequest(id, { name }),
    onSuccess: (resume) => {
      queryClient.setQueryData(queryKeys.resumes, (prev: (typeof resume)[] | undefined) =>
        upsertListItem(prev, resume),
      );
    },
  });

  const deleteResume = useMutation({
    mutationFn: (id: string) => deleteResumeRequest(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData(queryKeys.resumes, (prev: { id: string }[] | undefined) =>
        removeListItems(prev, [id]),
      );
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const createCoverText = useMutation({
    mutationFn: ({ name, body }: { name: string; body: string }) =>
      createCoverTextRequest(name, body),
    onSuccess: (letter) => {
      queryClient.setQueryData(queryKeys.coverLetter(letter.id), letter);
      queryClient.setQueryData(queryKeys.coverLetters, (prev: CoverLetterListItem[] | undefined) =>
        upsertListItem(prev, toCoverLetterListItem(letter)),
      );
    },
  });

  const uploadCover = useMutation({
    mutationFn: (file: File) => uploadCoverRequest(file),
    onSuccess: (letter) => {
      queryClient.setQueryData(queryKeys.coverLetter(letter.id), letter);
      queryClient.setQueryData(queryKeys.coverLetters, (prev: CoverLetterListItem[] | undefined) =>
        upsertListItem(prev, toCoverLetterListItem(letter)),
      );
    },
  });

  const patchCover = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      patchCoverRequest(id, patch),
    onSuccess: (letter) => {
      queryClient.setQueryData(queryKeys.coverLetter(letter.id), letter);
      queryClient.setQueryData(queryKeys.coverLetters, (prev: CoverLetterListItem[] | undefined) =>
        upsertListItem(prev, toCoverLetterListItem(letter)),
      );
    },
  });

  const deleteCover = useMutation({
    mutationFn: (id: string) => deleteCoverRequest(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.coverLetter(id) });
      queryClient.setQueryData(queryKeys.coverLetters, (prev: { id: string }[] | undefined) =>
        removeListItems(prev, [id]),
      );
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const createApplication = useMutation({
    mutationFn: (patch: Record<string, unknown>) => createApplicationRequest(patch),
    onSuccess: (created) => {
      syncApplication(created);
      invalidateSummary();
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });

  const patchApplication = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Application> }) =>
      patchApplicationRequest(id, patch),
    onSuccess: (updated) => {
      syncApplication(updated);
      invalidateSummary();
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });

  const deleteApplication = useMutation({
    mutationFn: (id: string) => deleteApplicationRequest(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.application(id) });
      for (const scope of ["active", "archived", "all"] as const) {
        queryClient.setQueryData<ApplicationListItem[]>(queryKeys.applications(scope), (prev) =>
          removeListItems(prev, [id]),
        );
      }
      invalidateSummary();
    },
  });

  const bulkApplications = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: "archive" | "unarchive" | "delete" }) =>
      bulkApplicationsRequest(ids, action),
    onSuccess: (_result, { ids, action }) => {
      if (action === "delete") {
        for (const id of ids) queryClient.removeQueries({ queryKey: queryKeys.application(id) });
      }
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      invalidateSummary();
    },
  });

  const createLead = useMutation({
    mutationFn: (patch: Record<string, unknown>) => createLeadRequest(patch),
    onSuccess: (created) => {
      syncLead(created);
      invalidateSummary();
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });

  const patchLead = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Lead> }) =>
      patchLeadRequest(id, patch),
    onSuccess: (updated) => {
      syncLead(updated);
      invalidateSummary();
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });

  const deleteLead = useMutation({
    mutationFn: (id: string) => deleteLeadRequest(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.lead(id) });
      for (const scope of ["active", "archived", "all"] as const) {
        queryClient.setQueryData<LeadListItem[]>(queryKeys.leads(scope), (prev) =>
          removeListItems(prev, [id]),
        );
      }
      invalidateSummary();
    },
  });

  const bulkLeads = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: "archive" | "unarchive" | "delete" }) =>
      bulkLeadsRequest(ids, action),
    onSuccess: (_result, { ids, action }) => {
      if (action === "delete") {
        for (const id of ids) queryClient.removeQueries({ queryKey: queryKeys.lead(id) });
      }
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      invalidateSummary();
    },
  });

  const createWishlist = useMutation({
    mutationFn: (patch: Record<string, unknown>) => createWishlistRequest(patch),
    onSuccess: (created) => {
      syncWishlist(created);
      invalidateSummary();
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });

  const patchWishlist = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Wishlist> }) =>
      patchWishlistRequest(id, patch),
    onSuccess: (updated) => {
      syncWishlist(updated);
      invalidateSummary();
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });

  const deleteWishlist = useMutation({
    mutationFn: (id: string) => deleteWishlistRequest(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.wishlist(id) });
      for (const scope of ["active", "archived", "all"] as const) {
        queryClient.setQueryData<WishlistListItem[]>(queryKeys.wishlists(scope), (prev) =>
          removeListItems(prev, [id]),
        );
      }
      invalidateSummary();
    },
  });

  const bulkWishlists = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: "archive" | "unarchive" | "delete" }) =>
      bulkWishlistsRequest(ids, action),
    onSuccess: (_result, { ids, action }) => {
      if (action === "delete") {
        for (const id of ids) queryClient.removeQueries({ queryKey: queryKeys.wishlist(id) });
      }
      void queryClient.invalidateQueries({ queryKey: ["wishlists"] });
      invalidateSummary();
    },
  });

  const createView = useMutation({
    mutationFn: (view: Omit<SavedView, "id">) => createViewRequest(view),
    onSuccess: (saved) => {
      queryClient.setQueryData<SavedView[]>(queryKeys.views(saved.screen), (prev) =>
        upsertListItem(prev, saved),
      );
      queryClient.setQueryData<SavedView[]>(queryKeys.views(), (prev) =>
        upsertListItem(prev, saved),
      );
    },
  });

  const deleteView = useMutation({
    mutationFn: (id: string) => deleteViewRequest(id),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: ["views"] });
      void id;
    },
  });

  return {
    createCompany,
    patchCompany,
    deleteCompany,
    uploadResume,
    patchResume,
    deleteResume,
    createCoverText,
    uploadCover,
    patchCover,
    deleteCover,
    createApplication,
    patchApplication,
    deleteApplication,
    bulkApplications,
    createLead,
    patchLead,
    deleteLead,
    bulkLeads,
    createWishlist,
    patchWishlist,
    deleteWishlist,
    bulkWishlists,
    createView,
    deleteView,
  };
}

export type WorkspaceMutations = ReturnType<typeof useWorkspaceMutations>;

export async function mutateCreateCompany(
  mutations: WorkspaceMutations,
  name: string,
  extra?: { website?: string; location?: string },
): Promise<string> {
  const company = await mutations.createCompany.mutateAsync({ name, extra });
  return company.id;
}

export async function mutateUploadResume(
  mutations: WorkspaceMutations,
  file: File,
): Promise<string> {
  const resume = await mutations.uploadResume.mutateAsync(file);
  return resume.id;
}

export async function mutateCreateCoverText(
  mutations: WorkspaceMutations,
  name: string,
  body: string,
): Promise<string> {
  const letter = await mutations.createCoverText.mutateAsync({ name, body });
  return letter.id;
}

export async function mutateUploadCover(
  mutations: WorkspaceMutations,
  file: File,
): Promise<string> {
  const letter = await mutations.uploadCover.mutateAsync(file);
  return letter.id;
}
