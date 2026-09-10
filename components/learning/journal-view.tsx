"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/learning/shared";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { ListPageSkeleton } from "@/components/workspace-skeletons";
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
  useLearningJournalQuery,
  useLearningMutations,
  useLearningPathsQuery,
} from "@/hooks/use-learning";
import { formatDisplayDate } from "@/lib/domain";

export function LearningJournalView() {
  const journalQuery = useLearningJournalQuery();
  const pathsQuery = useLearningPathsQuery("active");
  const mutations = useLearningMutations();
  const [actionError, setActionError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pathId, setPathId] = useState<string>("");

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  async function createEntry() {
    try {
      await mutations.createJournal.mutateAsync({
        title,
        body,
        entryDate,
        pathId: pathId || null,
      });
      setOpen(false);
      setTitle("");
      setBody("");
      setPathId("");
    } catch (cause) {
      fail(cause);
    }
  }

  if (journalQuery.isPending) {
    return (
      <>
        <WorkspacePageHeader
          title="Learning journal"
          description="Short reflections keep long maps honest."
        />
        <ListPageSkeleton columns={3} />
      </>
    );
  }

  const entries = journalQuery.data ?? [];
  const pathTitles = new Map((pathsQuery.data ?? []).map((path) => [path.id, path.title]));

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <WorkspacePageHeader
        title="Learning journal"
        description="Short reflections keep long maps honest."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            New entry
          </Button>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          title="No journal entries yet"
          description="Capture what clicked, what blocked you, and what to try tomorrow."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Write entry
            </Button>
          }
        />
      ) : (
        <div className="mx-4 mb-10 space-y-6 md:mx-7">
          {entries.map((entry) => (
            <article key={entry.id} className="border-b border-border pb-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {formatDisplayDate(entry.entryDate)}
                    {entry.pathId
                      ? ` · ${entry.pathTitle || pathTitles.get(entry.pathId) || "Map"}`
                      : ""}
                  </p>
                  {entry.title ? (
                    <h2 className="mt-1 text-base font-medium">{entry.title}</h2>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => mutations.deleteJournal.mutate(entry.id, { onError: fail })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {entry.body}
              </p>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Journal entry</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Date</FieldLabel>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Title (optional)</FieldLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Linked map (optional)</FieldLabel>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={pathId}
                onChange={(e) => setPathId(e.target.value)}
              >
                <option value="">None</option>
                {(pathsQuery.data ?? []).map((path) => (
                  <option key={path.id} value={path.id}>
                    {path.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel>Reflection</FieldLabel>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="What did you learn? What will you do next?"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!body.trim() || mutations.createJournal.isPending}
              onClick={createEntry}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
