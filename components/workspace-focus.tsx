"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type WorkspaceFocus =
  | { kind: "application"; id: string }
  | { kind: "company"; id: string }
  | { kind: "lead"; id: string }
  | { kind: "wishlist"; id: string }
  | { kind: "learning-path"; id: string }
  | { kind: "learning-module"; id: string; pathId: string }
  | { kind: "learning-topic"; id: string; pathId: string };

type WorkspaceFocusContextValue = {
  focus: WorkspaceFocus | null;
  setFocus: (focus: WorkspaceFocus | null) => void;
  consumeFocus: (kind: WorkspaceFocus["kind"]) => string | null;
};

const WorkspaceFocusContext = createContext<WorkspaceFocusContextValue | null>(null);

export function useWorkspaceFocus() {
  const value = useContext(WorkspaceFocusContext);
  if (!value) throw new Error("useWorkspaceFocus must be used within WorkspaceShell");
  return value;
}

export function WorkspaceFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<WorkspaceFocus | null>(null);

  const consumeFocus = useCallback(
    (kind: WorkspaceFocus["kind"]) => {
      if (!focus || focus.kind !== kind) return null;
      const id = focus.id;
      setFocus(null);
      return id;
    },
    [focus],
  );

  const value = useMemo(() => ({ focus, setFocus, consumeFocus }), [focus, consumeFocus]);

  return <WorkspaceFocusContext.Provider value={value}>{children}</WorkspaceFocusContext.Provider>;
}
