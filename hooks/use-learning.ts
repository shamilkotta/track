"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArchiveScope, LearningPathDetail, LearningResourcePatch } from "@/lib/domain";
import {
  createLearningItemRequest,
  createLearningJournalRequest,
  createLearningModuleRequest,
  createLearningPathRequest,
  createLearningResourceRequest,
  deleteLearningItemRequest,
  deleteLearningJournalRequest,
  deleteLearningModuleRequest,
  deleteLearningPathRequest,
  deleteLearningResourceRequest,
  fetchDueLearningItems,
  fetchLearningJournal,
  fetchLearningOverview,
  fetchLearningPath,
  fetchLearningPaths,
  fetchLearningResources,
  fetchLearningSchedule,
  patchLearningItemRequest,
  patchLearningJournalRequest,
  patchLearningModuleRequest,
  patchLearningPathRequest,
  patchLearningResourceRequest,
} from "@/lib/learning-api";

export const learningKeys = {
  overview: ["learning", "overview"] as const,
  paths: (scope: ArchiveScope) => ["learning", "paths", scope] as const,
  path: (id: string) => ["learning", "path", id] as const,
  due: (from?: string, to?: string) => ["learning", "due", from ?? "", to ?? ""] as const,
  schedule: (from?: string, to?: string) => ["learning", "schedule", from ?? "", to ?? ""] as const,
  resources: ["learning", "resources"] as const,
  journal: ["learning", "journal"] as const,
};

function invalidateLearning(queryClient: ReturnType<typeof useQueryClient>, pathId?: string) {
  void queryClient.invalidateQueries({ queryKey: ["learning"] });
  void queryClient.invalidateQueries({ queryKey: ["workspace", "summary"] });
  if (pathId) void queryClient.invalidateQueries({ queryKey: learningKeys.path(pathId) });
}

export function useLearningOverviewQuery() {
  return useQuery({ queryKey: learningKeys.overview, queryFn: fetchLearningOverview });
}

export function useLearningPathsQuery(scope: ArchiveScope = "active") {
  return useQuery({
    queryKey: learningKeys.paths(scope),
    queryFn: () => fetchLearningPaths(scope),
  });
}

export function useLearningPathQuery(id: string) {
  return useQuery({
    queryKey: learningKeys.path(id),
    queryFn: () => fetchLearningPath(id),
    enabled: Boolean(id),
  });
}

export function useDueLearningItemsQuery(from?: string, to?: string) {
  return useQuery({
    queryKey: learningKeys.due(from, to),
    queryFn: () => fetchDueLearningItems(from, to),
  });
}

export function useLearningScheduleQuery(from?: string, to?: string) {
  return useQuery({
    queryKey: learningKeys.schedule(from, to),
    queryFn: () => fetchLearningSchedule(from, to),
  });
}

export function useLearningResourcesQuery() {
  return useQuery({ queryKey: learningKeys.resources, queryFn: fetchLearningResources });
}

export function useLearningJournalQuery() {
  return useQuery({ queryKey: learningKeys.journal, queryFn: fetchLearningJournal });
}

export function useLearningMutations() {
  const queryClient = useQueryClient();

  function setPathCache(detail: LearningPathDetail) {
    queryClient.setQueryData(learningKeys.path(detail.id), detail);
    invalidateLearning(queryClient, detail.id);
  }

  return {
    createPath: useMutation({
      mutationFn: createLearningPathRequest,
      onSuccess: (detail) => setPathCache(detail),
    }),
    patchPath: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
        patchLearningPathRequest(id, patch),
      onSuccess: (detail) => setPathCache(detail),
    }),
    deletePath: useMutation({
      mutationFn: deleteLearningPathRequest,
      onSuccess: () => invalidateLearning(queryClient),
    }),
    createModule: useMutation({
      mutationFn: ({ pathId, data }: { pathId: string; data: Record<string, unknown> }) =>
        createLearningModuleRequest(pathId, data),
      onSuccess: (detail) => setPathCache(detail),
    }),
    patchModule: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
        patchLearningModuleRequest(id, patch),
      onSuccess: (detail) => setPathCache(detail),
    }),
    deleteModule: useMutation({
      mutationFn: deleteLearningModuleRequest,
      onSuccess: (detail) => setPathCache(detail),
    }),
    createItem: useMutation({
      mutationFn: ({ moduleId, data }: { moduleId: string; data: Record<string, unknown> }) =>
        createLearningItemRequest(moduleId, data),
      onSuccess: (detail) => setPathCache(detail),
    }),
    patchItem: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
        patchLearningItemRequest(id, patch),
      onSuccess: (detail) => setPathCache(detail),
    }),
    deleteItem: useMutation({
      mutationFn: deleteLearningItemRequest,
      onSuccess: (detail) => setPathCache(detail),
    }),
    createResource: useMutation({
      mutationFn: createLearningResourceRequest,
      onSuccess: (resource) => invalidateLearning(queryClient, resource.pathId ?? undefined),
    }),
    patchResource: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: LearningResourcePatch }) =>
        patchLearningResourceRequest(id, patch),
      onSuccess: (resource) => invalidateLearning(queryClient, resource.pathId ?? undefined),
    }),
    deleteResource: useMutation({
      mutationFn: deleteLearningResourceRequest,
      onSuccess: () => invalidateLearning(queryClient),
    }),
    createJournal: useMutation({
      mutationFn: createLearningJournalRequest,
      onSuccess: () => invalidateLearning(queryClient),
    }),
    patchJournal: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
        patchLearningJournalRequest(id, patch),
      onSuccess: () => invalidateLearning(queryClient),
    }),
    deleteJournal: useMutation({
      mutationFn: deleteLearningJournalRequest,
      onSuccess: () => invalidateLearning(queryClient),
    }),
  };
}
