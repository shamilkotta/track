"use client";

import { useState } from "react";
import { ListFilter, Plus, X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { SavedView } from "@/lib/domain";

export function SavedViewsMenu({
  views,
  current,
  onSave,
  onDelete,
  onApply,
}: {
  views: SavedView[];
  current: Omit<SavedView, "id" | "name">;
  onSave: (view: Omit<SavedView, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onApply: (view: SavedView) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedView | null>(null);

  function closeDialog() {
    setDialogOpen(false);
    setName("");
    setPending(false);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setPending(true);
    try {
      await onSave({ ...current, name: trimmed });
      closeDialog();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="ml-auto text-muted-foreground" />}
        >
          <ListFilter />
          Saved views
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {views.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No saved views yet.</p>
          )}
          {views.map((view) => (
            <DropdownMenuItem key={view.id} onClick={() => onApply(view)}>
              <span className="min-w-0 flex-1 truncate">{view.name}</span>
              <button
                type="button"
                aria-label={`Delete ${view.name}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteTarget(view);
                }}
              >
                <X className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus />
            Save current view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setName("");
            setPending(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
            <DialogDescription>
              Stores the current search, filters, and sort so you can reopen them later.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="View name"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button disabled={!name.trim() || pending} onClick={() => void submit()}>
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete saved view?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed. This cannot be undone.`
            : undefined
        }
        onConfirm={async () => {
          if (!deleteTarget) return;
          await onDelete(deleteTarget.id);
        }}
      />
    </>
  );
}
