"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "nlite/navigation";
import { useWorkspaceFocus } from "@/components/workspace-shell";
import { useLearningMutations } from "@/hooks/use-learning";
import { learningMapPath, type LearningResource } from "@/lib/domain";

const lineInputClass =
  "h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-1 text-sm shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0";

export function parseResourceLine(value: string): string {
  return value.trim();
}

type DisplayLine =
  | { key: string; type: "resource"; resource: LearningResource; afterResourceId: string | null }
  | {
      key: string;
      type: "draft";
      value: string;
      afterResourceId: string | null;
      draftKey?: string;
      trailing?: boolean;
    };

export function ResourceLinesEditor({
  resources,
  pathId = null,
  itemId = null,
  onError,
}: {
  resources: LearningResource[];
  pathId?: string | null;
  itemId?: string | null;
  onError: (cause: unknown) => void;
}) {
  const mutations = useLearningMutations();
  const router = useRouter();
  const { setFocus } = useWorkspaceFocus();
  const [inserts, setInserts] = useState<
    Array<{ key: string; value: string; afterResourceId: string | null }>
  >([]);
  const [trailing, setTrailing] = useState("");
  const [focusKey, setFocusKey] = useState("trailing");
  const [focusNonce, setFocusNonce] = useState(0);
  const draftSeq = useRef(0);

  function openTopic(resource: LearningResource) {
    if (!resource.pathId || !resource.itemId) return;
    setFocus({ kind: "learning-topic", id: resource.itemId, pathId: resource.pathId });
    router.push(learningMapPath(resource.pathId));
  }

  function newDraftKey() {
    draftSeq.current += 1;
    return `draft-${draftSeq.current}`;
  }

  function requestFocus(key: string) {
    setFocusKey(key);
    setFocusNonce((nonce) => nonce + 1);
  }

  const lines = useMemo(() => {
    const next: DisplayLine[] = [];
    for (const insert of inserts.filter((entry) => entry.afterResourceId === null)) {
      next.push({
        key: insert.key,
        type: "draft",
        value: insert.value,
        afterResourceId: null,
        draftKey: insert.key,
      });
    }
    for (const resource of resources) {
      next.push({
        key: resource.id,
        type: "resource",
        resource,
        afterResourceId: resource.id,
      });
      for (const insert of inserts.filter((entry) => entry.afterResourceId === resource.id)) {
        next.push({
          key: insert.key,
          type: "draft",
          value: insert.value,
          afterResourceId: resource.id,
          draftKey: insert.key,
        });
      }
    }
    next.push({
      key: "trailing",
      type: "draft",
      value: trailing,
      afterResourceId: resources.at(-1)?.id ?? null,
      trailing: true,
    });
    return next;
  }, [inserts, resources, trailing]);

  function createPayload(title: string, afterResourceId: string | null) {
    return {
      title,
      ...(pathId ? { pathId } : {}),
      ...(itemId ? { itemId } : {}),
      afterResourceId,
    };
  }

  function addAfter(line: DisplayLine) {
    const afterResourceId = line.type === "resource" ? line.resource.id : line.afterResourceId;
    const key = newDraftKey();
    const neu = { key, value: "", afterResourceId };

    if (line.type === "resource") {
      setInserts((prev) => {
        const firstAfter = prev.findIndex((entry) => entry.afterResourceId === line.resource.id);
        if (firstAfter < 0) return [...prev, neu];
        const next = [...prev];
        next.splice(firstAfter, 0, neu);
        return next;
      });
      requestFocus(key);
      return;
    }

    if (line.type === "draft" && line.trailing) {
      setInserts((prev) => [...prev, neu]);
      requestFocus(key);
      return;
    }

    if (line.type === "draft" && line.draftKey) {
      setInserts((prev) => {
        const index = prev.findIndex((entry) => entry.key === line.draftKey);
        if (index < 0) return [...prev, neu];
        const next = [...prev];
        next.splice(index + 1, 0, neu);
        return next;
      });
      requestFocus(key);
    }
  }

  async function createLine(
    value: string,
    afterResourceId: string | null,
    options?: { draftKey?: string; continueEditing?: boolean },
  ) {
    const title = parseResourceLine(value);
    if (!title) {
      if (options?.continueEditing) requestFocus(options.draftKey ?? "trailing");
      return;
    }
    try {
      const created = await mutations.createResource.mutateAsync(
        createPayload(title, afterResourceId),
      );
      if (options?.continueEditing) {
        const key = newDraftKey();
        setInserts((prev) => [
          ...prev.filter((entry) => entry.key !== options.draftKey),
          { key, value: "", afterResourceId: created.id },
        ]);
        if (!options.draftKey) setTrailing("");
        requestFocus(key);
        return;
      }
      if (options?.draftKey) {
        setInserts((prev) => prev.filter((entry) => entry.key !== options.draftKey));
      } else {
        setTrailing("");
      }
    } catch (cause) {
      onError(cause);
    }
  }

  async function saveExisting(
    resource: LearningResource,
    value: string,
    options?: { continueEditing?: boolean; line?: DisplayLine },
  ) {
    const title = parseResourceLine(value);

    if (value.trim() !== resource.title.trim()) {
      if (!title) {
        try {
          await mutations.deleteResource.mutateAsync(resource.id);
        } catch (cause) {
          onError(cause);
        }
        return;
      }
      try {
        await mutations.patchResource.mutateAsync({
          id: resource.id,
          patch: { title },
        });
      } catch (cause) {
        onError(cause);
        return;
      }
    }

    if (options?.continueEditing && options.line) {
      addAfter(options.line);
    }
  }

  return (
    <div className="space-y-0.5">
      {lines.map((line, index) => {
        const showAdd = index < lines.length - 2;

        if (line.type === "resource") {
          const topicLabel = line.resource.itemTitle;
          const canOpenTopic = Boolean(
            line.resource.itemId && line.resource.pathId && topicLabel,
          );
          return (
            <ResourceLine
              key={line.resource.id}
              value={line.resource.title}
              ariaLabel={`Resource ${line.resource.title}`}
              focus={focusKey === line.resource.id}
              focusNonce={focusKey === line.resource.id ? focusNonce : 0}
              showAdd={showAdd}
              end={
                canOpenTopic ? (
                  <button
                    type="button"
                    className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-2"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openTopic(line.resource)}
                  >
                    {topicLabel}
                  </button>
                ) : null
              }
              onCommit={(value) => void saveExisting(line.resource, value)}
              onEnter={(value) =>
                void saveExisting(line.resource, value, {
                  continueEditing: true,
                  line,
                })
              }
              onAdd={() => addAfter(line)}
            />
          );
        }

        return (
          <ResourceLine
            key={line.key}
            value={line.value}
            ariaLabel="New resource"
            placeholder="Add a resource…"
            focus={focusKey === line.key}
            focusNonce={focusKey === line.key ? focusNonce : 0}
            showAdd={showAdd}
            onChange={(value) => {
              if (line.trailing) {
                setTrailing(value);
                return;
              }
              setInserts((prev) =>
                prev.map((entry) => (entry.key === line.draftKey ? { ...entry, value } : entry)),
              );
            }}
            onCommit={(value) =>
              void createLine(value, line.afterResourceId, {
                draftKey: line.trailing ? undefined : line.draftKey,
              })
            }
            onEnter={(value) => {
              if (line.trailing) {
                void (async () => {
                  const title = parseResourceLine(value);
                  if (!title) {
                    requestFocus("trailing");
                    return;
                  }
                  try {
                    await mutations.createResource.mutateAsync(
                      createPayload(title, line.afterResourceId),
                    );
                    setTrailing("");
                    requestFocus("trailing");
                  } catch (cause) {
                    onError(cause);
                  }
                })();
                return;
              }
              void createLine(value, line.afterResourceId, {
                draftKey: line.draftKey,
                continueEditing: true,
              });
            }}
            onAdd={() => addAfter(line)}
          />
        );
      })}
    </div>
  );
}

function ResourceLine({
  value,
  placeholder,
  ariaLabel,
  focus,
  focusNonce = 0,
  showAdd = true,
  end,
  onChange,
  onCommit,
  onEnter,
  onAdd,
}: {
  value: string;
  placeholder?: string;
  ariaLabel: string;
  focus?: boolean;
  focusNonce?: number;
  showAdd?: boolean;
  end?: ReactNode;
  onChange?: (value: string) => void;
  onCommit: (value: string) => void;
  onEnter: (value: string) => void;
  onAdd: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);
  const current = onChange ? value : draft;

  useEffect(() => {
    if (!focus) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, focusNonce]);

  return (
    <div className="flex items-center gap-1">
      {showAdd ? (
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:bg-muted focus-visible:opacity-100"
          aria-label="Add resource line below"
          onClick={onAdd}
        >
          <Plus className="size-3.5" />
        </button>
      ) : (
        <span className="size-7 shrink-0" aria-hidden />
      )}
      <input
        ref={inputRef}
        value={current}
        onChange={(event) => {
          const next = event.target.value;
          if (onChange) onChange(next);
          else setDraft(next);
        }}
        onBlur={() => {
          if (skipBlurRef.current) {
            skipBlurRef.current = false;
            return;
          }
          onCommit(current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            skipBlurRef.current = true;
            onEnter(current);
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={lineInputClass}
      />
      {end}
    </div>
  );
}
