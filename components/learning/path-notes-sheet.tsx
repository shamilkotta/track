"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useLearningMutations } from "@/hooks/use-learning";
import type { LearningPathDetail } from "@/lib/domain";

export function PathNotesSheet({
  path,
  open,
  onOpenChange,
  moduleId,
  onError,
}: {
  path: LearningPathDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId?: string | null;
  onError: (cause: unknown) => void;
}) {
  const scopedModule = moduleId
    ? (path.modules.find((module) => module.id === moduleId) ?? null)
    : null;
  const isModuleScoped = Boolean(moduleId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl"
        showCloseButton
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-base">Notes</SheetTitle>
          <SheetDescription>
            {isModuleScoped
              ? "This module and its topics."
              : "Map, modules, and topics in one place."}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <NotesDocument
            key={`${path.id}:${moduleId ?? "all"}`}
            path={path}
            moduleId={moduleId}
            scopedModule={scopedModule}
            onError={onError}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function NotesDocument({
  path,
  moduleId,
  scopedModule,
  onError,
}: {
  path: LearningPathDetail;
  moduleId?: string | null;
  scopedModule: LearningPathDetail["modules"][number] | null;
  onError: (cause: unknown) => void;
}) {
  const mutations = useLearningMutations();
  const modules = moduleId ? (scopedModule ? [scopedModule] : []) : path.modules;

  const [pathNotes, setPathNotes] = useState(path.description);
  const [moduleNotes, setModuleNotes] = useState(() =>
    Object.fromEntries(modules.map((module) => [module.id, module.description])),
  );
  const [itemNotes, setItemNotes] = useState(() =>
    Object.fromEntries(
      modules.flatMap((module) => module.items.map((item) => [item.id, item.notes])),
    ),
  );
  const [saving, setSaving] = useState(false);

  async function savePathNotes() {
    if (pathNotes === path.description) return;
    setSaving(true);
    try {
      await mutations.patchPath.mutateAsync({
        id: path.id,
        patch: { description: pathNotes },
      });
    } catch (cause) {
      onError(cause);
    } finally {
      setSaving(false);
    }
  }

  async function saveModuleNotes(id: string) {
    const module = path.modules.find((entry) => entry.id === id);
    const next = moduleNotes[id] ?? "";
    if (!module || next === module.description) return;
    setSaving(true);
    try {
      await mutations.patchModule.mutateAsync({
        id,
        patch: { description: next },
      });
    } catch (cause) {
      onError(cause);
    } finally {
      setSaving(false);
    }
  }

  async function saveItemNotes(itemId: string) {
    const item = path.modules
      .flatMap((module) => module.items)
      .find((entry) => entry.id === itemId);
    const next = itemNotes[itemId] ?? "";
    if (!item || next === item.notes) return;
    setSaving(true);
    try {
      await mutations.patchItem.mutateAsync({
        id: itemId,
        patch: { notes: next },
      });
    } catch (cause) {
      onError(cause);
    } finally {
      setSaving(false);
    }
  }

  if (moduleId && !scopedModule) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="text-sm text-muted-foreground">This module is no longer available.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
      {saving ? <p className="text-xs text-muted-foreground">Saving…</p> : null}

      {!moduleId ? (
        <section className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{path.title}</h2>
          <NoteField
            value={pathNotes}
            onChange={setPathNotes}
            onBlur={savePathNotes}
            placeholder="Add a note…"
          />
        </section>
      ) : null}

      {modules.map((module) => (
        <section key={module.id} className="space-y-3">
          <div className="space-y-1">
            <h3
              className={
                moduleId
                  ? "text-xl font-semibold tracking-tight"
                  : "text-lg font-semibold tracking-tight"
              }
            >
              {module.title}
            </h3>
            <NoteField
              value={moduleNotes[module.id] ?? ""}
              onChange={(value) => setModuleNotes((prev) => ({ ...prev, [module.id]: value }))}
              onBlur={() => saveModuleNotes(module.id)}
              placeholder="Add a note…"
            />
          </div>

          {module.items.map((item) => (
            <div key={item.id} className="space-y-1 pl-3">
              <h4 className="text-sm font-semibold tracking-tight text-foreground">{item.title}</h4>
              <NoteField
                value={itemNotes[item.id] ?? ""}
                onChange={(value) => setItemNotes((prev) => ({ ...prev, [item.id]: value }))}
                onBlur={() => saveItemNotes(item.id)}
                placeholder="Add a note…"
              />
            </div>
          ))}
        </section>
      ))}

      {!moduleId && path.modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add modules to attach module and topic notes.
        </p>
      ) : null}
    </div>
  );
}

function NoteField({
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
}) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      rows={1}
      placeholder={placeholder}
      className="min-h-0 resize-none border-0 bg-transparent px-0 py-0.5 shadow-none focus-visible:ring-0"
    />
  );
}
