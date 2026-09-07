"use client";

import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/learning/shared";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { NativeSelectField } from "@/components/workspace-fields";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useLearningMutations,
  useLearningPathsQuery,
  useLearningResourcesQuery,
} from "@/hooks/use-learning";
import {
  isLearningResourceKind,
  learningResourceKinds,
  type LearningResourceKind,
} from "@/lib/domain";

export function LearningResourcesView() {
  const resourcesQuery = useLearningResourcesQuery();
  const pathsQuery = useLearningPathsQuery("active");
  const mutations = useLearningMutations();
  const [actionError, setActionError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<LearningResourceKind>("article");
  const [pathId, setPathId] = useState("");

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  async function createResource() {
    try {
      await mutations.createResource.mutateAsync({
        title,
        url,
        notes,
        kind,
        pathId: pathId || null,
      });
      setOpen(false);
      setTitle("");
      setUrl("");
      setNotes("");
      setKind("article");
      setPathId("");
    } catch (cause) {
      fail(cause);
    }
  }

  if (resourcesQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader
          title="Resources"
          description="Articles, courses, repos, and notes linked across your paths."
        />
        <ListPageSkeleton columns={4} />
      </>
    );
  }

  const resources = resourcesQuery.data ?? [];
  const paths = pathsQuery.data ?? [];
  const pathIds = ["", ...paths.map((path) => path.id)] as const;
  const pathLabel = (id: string) =>
    id === "" ? "None" : (paths.find((path) => path.id === id)?.title ?? id);

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <WorkspacePageHeader
        title="Resources"
        description="Articles, courses, repos, and notes linked across your paths."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Add resource
          </Button>
        }
      />

      {resources.length === 0 ? (
        <EmptyState
          title="No resources yet"
          description="Save links while planning a path, or collect them here as a library."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Add resource
            </Button>
          }
        />
      ) : (
        <div className="mx-4 mb-10 divide-y divide-border border-y border-border md:mx-7">
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-start gap-3 py-4">
              <Badge variant="outline" className="mt-0.5 capitalize">
                {resource.kind}
              </Badge>
              <div className="min-w-0 flex-1">
                {resource.url ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline"
                  >
                    {resource.title}
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : (
                  <p className="text-sm font-medium">{resource.title}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {resource.pathTitle || "Unlinked"}
                  {resource.notes ? ` · ${resource.notes}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => mutations.deleteResource.mutate(resource.id, { onError: fail })}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add resource</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>URL</FieldLabel>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Kind</FieldLabel>
                <NativeSelectField
                  value={kind}
                  onChange={setKind}
                  options={learningResourceKinds}
                  guard={isLearningResourceKind}
                />
              </Field>
              <Field>
                <FieldLabel>Path</FieldLabel>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={pathId}
                  onChange={(e) => setPathId(e.target.value)}
                >
                  {pathIds.map((id) => (
                    <option key={id || "none"} value={id}>
                      {pathLabel(id)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || mutations.createResource.isPending}
              onClick={createResource}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
