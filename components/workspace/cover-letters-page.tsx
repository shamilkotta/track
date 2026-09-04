"use client";

import { useRef, useState } from "react";
import { Pencil, Upload } from "lucide-react";
import { CoverLettersView } from "@/components/job-hunt-workspace";
import { ActionErrorBanner, failMessage } from "@/components/workspace/action-error";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { StackPageSkeleton } from "@/components/workspace-skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  mutateCreateCoverText,
  mutateUploadCover,
  useApplicationsQuery,
  useCompaniesQuery,
  useCoverLettersQuery,
  useWorkspaceMutations,
} from "@/hooks/use-workspace";

export default function CoverLettersPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [writing, setWriting] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const coverLettersQuery = useCoverLettersQuery();
  const applicationsQuery = useApplicationsQuery("all");
  const companiesQuery = useCompaniesQuery();
  const mutations = useWorkspaceMutations();
  const pending =
    coverLettersQuery.isPending || applicationsQuery.isPending || companiesQuery.isPending;

  function fail(cause: unknown) {
    setActionError(failMessage(cause));
  }

  async function createText(name: string, body: string) {
    try {
      return await mutateCreateCoverText(mutations, name, body);
    } catch (cause) {
      fail(cause);
      throw cause;
    }
  }

  async function upload(file: File) {
    try {
      return await mutateUploadCover(mutations, file);
    } catch (cause) {
      fail(cause);
      throw cause;
    }
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => {
          setDraftName("");
          setDraftBody("");
          setWriting(true);
        }}
      >
        <Pencil /> Write cover letter
      </Button>
      <Button onClick={() => fileRef.current?.click()}>
        <Upload /> Upload cover letter
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );

  return (
    <>
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      {pending ? (
        <>
          <WorkspacePageHeader
            title="Cover letters"
            description="Open any letter to read the full text or file details."
            actions={headerActions}
          />
          <StackPageSkeleton />
        </>
      ) : (
        <CoverLettersView
          coverLetters={coverLettersQuery.data ?? []}
          applications={applicationsQuery.data ?? []}
          companies={companiesQuery.data ?? []}
          onCreateText={createText}
          onUpload={upload}
          onPatch={async (id, patch) => {
            try {
              await mutations.patchCover.mutateAsync({ id, patch });
            } catch (cause) {
              fail(cause);
            }
          }}
          onDelete={async (id) => {
            try {
              await mutations.deleteCover.mutateAsync(id);
            } catch (cause) {
              fail(cause);
            }
          }}
        />
      )}
      <Dialog
        open={writing}
        onOpenChange={(open) => {
          setWriting(open);
          if (!open) {
            setDraftName("");
            setDraftBody("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Write cover letter</DialogTitle>
            <DialogDescription>Save reusable letter text.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="General product roles"
              />
            </Field>
            <Field>
              <FieldLabel>Text</FieldLabel>
              <Textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                className="min-h-36"
                placeholder="Write your letter…"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriting(false)}>
              Cancel
            </Button>
            <Button
              disabled={!draftName.trim() || !draftBody.trim()}
              onClick={() => {
                void createText(draftName.trim(), draftBody.trim()).then(() => {
                  setDraftName("");
                  setDraftBody("");
                  setWriting(false);
                });
              }}
            >
              Save cover letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
