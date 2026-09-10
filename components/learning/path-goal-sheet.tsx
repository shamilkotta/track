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

export function PathGoalSheet({
  path,
  open,
  onOpenChange,
  onError,
}: {
  path: LearningPathDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (cause: unknown) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl"
        showCloseButton
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-base">Goal</SheetTitle>
          <SheetDescription>What this map is aiming for.</SheetDescription>
        </SheetHeader>
        {open ? <GoalEditor key={path.id} path={path} onError={onError} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function GoalEditor({
  path,
  onError,
}: {
  path: LearningPathDetail;
  onError: (cause: unknown) => void;
}) {
  const mutations = useLearningMutations();
  const [goal, setGoal] = useState(path.goal);
  const [saving, setSaving] = useState(false);

  async function saveGoal() {
    if (goal === path.goal) return;
    setSaving(true);
    try {
      await mutations.patchPath.mutateAsync({
        id: path.id,
        patch: { goal },
      });
    } catch (cause) {
      onError(cause);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5">
      {saving ? <p className="mb-2 text-xs text-muted-foreground">Saving…</p> : null}
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{path.title}</h2>
        <Textarea
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          onBlur={saveGoal}
          rows={1}
          placeholder="Add a goal…"
          className="min-h-0 resize-none border-0 bg-transparent px-0 py-0.5 shadow-none focus-visible:ring-0"
        />
      </section>
    </div>
  );
}
