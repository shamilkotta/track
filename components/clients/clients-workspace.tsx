"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "nlite/navigation";
import { useWorkspaceFocus } from "@/components/workspace-focus";
import type { CardPanel } from "@/components/clients/parts";
import {
  buildSections,
  ViewBody,
  type ArchiveFilter,
  type ClientActions,
  type Row,
  type ViewContext,
} from "@/components/clients/views";
import { ActionErrorBanner } from "@/components/workspace/action-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { clientKeys, useClientBoardQuery } from "@/hooks/use-clients";
import {
  approveDraftRequest,
  ClientsApiError,
  dealRequest,
  dropLeadRequest,
  editDraftRequest,
  holdLeadRequest,
  leadActionRequest,
  noteRequest,
  retryEventRequest,
  reviseDraftRequest,
  tasksRequest,
} from "@/lib/clients/api";
import {
  clientViewFromPathname,
  clientViews,
  formatMoney,
  viewForLead,
  type ClientStats,
  type ClientView,
} from "@/lib/clients/domain";
import { screenPath, screenTitles } from "@/lib/domain";

const UNDO_MS = 4000;
const EXIT_MS = 240;

const viewSubtitles: Record<ClientView, string> = {
  inbox: "Drafts from client-hunter, waiting for your call",
  waiting: "Sent and waiting on a reply",
  replies: "People who wrote back",
  active: "Paying clients and their work",
  archive: "Dropped and cold leads",
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function errorText(cause: unknown) {
  if (cause instanceof ClientsApiError && cause.message === "stale") {
    return "A newer version arrived, showing it now.";
  }
  return cause instanceof Error ? cause.message : "Something went wrong";
}

// ---------- pending (undoable) actions ----------

type PendingAction = {
  key: string; // lead id hidden while pending
  label: string;
  commit: (keepalive: boolean) => Promise<unknown>;
};

function useUndoQueue(onError: (cause: unknown) => void) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const pendingRef = useRef<PendingAction | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const unhide = useCallback((key: string) => {
    const drop = (current: Set<string>) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    };
    setHidden(drop);
    setExiting(drop);
  }, []);

  const dismiss = () => {
    setLeaving(true);
    window.setTimeout(() => {
      setPending(null);
      setLeaving(false);
    }, 120);
  };

  const flush = useCallback(
    (keepalive: boolean) => {
      const action = pendingRef.current;
      if (!action) return;
      pendingRef.current = null;
      clearTimer();
      dismiss();
      void action
        .commit(keepalive)
        .catch((cause) => onError(cause))
        .finally(async () => {
          await queryClient.invalidateQueries({ queryKey: clientKeys.board });
          unhide(action.key);
        });
    },
    [onError, queryClient, unhide],
  );

  const schedule = useCallback(
    (action: PendingAction) => {
      if (pendingRef.current) flush(false);
      setExiting((current) => new Set(current).add(action.key));
      window.setTimeout(() => setHidden((current) => new Set(current).add(action.key)), EXIT_MS);
      pendingRef.current = action;
      setPending(action);
      setLeaving(false);
      timerRef.current = window.setTimeout(() => flush(false), UNDO_MS);
    },
    [flush],
  );

  // returns the lead id that came back, so the frame can reselect it
  const undo = useCallback((): string | null => {
    const action = pendingRef.current;
    if (!action) return null;
    pendingRef.current = null;
    clearTimer();
    unhide(action.key);
    dismiss();
    return action.key;
  }, [unhide]);

  useEffect(() => {
    const onPageHide = () => flush(true);
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flush]);

  return { pending, leaving, hidden, exiting, schedule, undo };
}

// ---------- header stats ----------

function Stats({ stats }: { stats: ClientStats }) {
  const earned = stats.earned.length
    ? stats.earned.map((item) => formatMoney(item.amount, item.currency)).join(" + ")
    : formatMoney(0, "GBP");
  const items: Array<[string, string]> = [
    ["Sent 7d", String(stats.sent7d)],
    ["Reply rate", stats.replyRate === null ? "—" : `${stats.replyRate}%`],
    ["In talks", String(stats.inTalks)],
    ["Won", String(stats.won)],
    ["Earned", earned],
  ];
  return (
    <dl className="clients-stats" data-testid="stats">
      {items.map(([label, value]) => (
        <div key={label} data-stat={label}>
          <dt>{label}</dt>
          <dd className="clients-num">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rows: Array<[string, string]> = [
    ["j / k", "next / previous lead"],
    ["a", "approve the draft"],
    ["r", "ask client-hunter to revise"],
    ["e", "edit the draft yourself"],
    ["d", "drop the lead"],
    ["z", "undo while the toast is visible"],
    ["/", "search the list"],
    ["⌘ / ctrl + enter", "save or send in a text box"],
    ["esc", "cancel, or back to the list"],
    ["1 – 5", "inbox, waiting, replies, active, archive"],
    ["?", "this sheet"],
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Work when no text field is focused.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([keys, label]) => (
            <div key={keys} className="contents">
              <dt>
                <Kbd>{keys}</Kbd>
              </dt>
              <dd className="text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

// ---------- main ----------

// The clients layout owns the board, selection, undo queue, toast and shortcuts so
// they survive navigation between /clients/* pages; each page renders its view
// through this context. The page's ClientsView reports itself as the shown view
// before paint, so the header and body only change together.
type ClientsViewContextValue = {
  render: (view: ClientView) => ReactNode;
  onShown: (view: ClientView) => void;
};
const ClientsViewContext = createContext<ClientsViewContextValue | null>(null);

export function ClientsView({ view }: { view: ClientView }) {
  const context = useContext(ClientsViewContext);
  const onShown = context?.onShown;
  useLayoutEffect(() => {
    onShown?.(view);
  }, [onShown, view]);
  if (!context) throw new Error("ClientsView must be rendered inside ClientsFrame");
  return (
    <div className="clients-view-body" data-view={view}>
      {context.render(view)}
    </div>
  );
}

export function ClientsFrame({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const board = useClientBoardQuery();
  const router = useRouter();
  const pathView = clientViewFromPathname(usePathname());
  const [shownView, setShownView] = useState<ClientView | null>(null);
  const view = shownView ?? pathView;
  const { focus, setFocus, consumeFocus } = useWorkspaceFocus();
  const [actionError, setActionError] = useState<string | null>(null);
  const [panels, setPanels] = useState<Record<string, CardPanel>>({});
  const [picked, setPicked] = useState<Partial<Record<ClientView, string>>>({});
  const [queries, setQueries] = useState<Partial<Record<ClientView, string>>>({});
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const fail = useCallback(
    (cause: unknown) => {
      setActionError(errorText(cause));
      if (cause instanceof ClientsApiError && cause.status === 409) {
        void queryClient.invalidateQueries({ queryKey: clientKeys.board });
      }
    },
    [queryClient],
  );
  const undoQueue = useUndoQueue(fail);

  const setView = useCallback(
    (next: ClientView) => {
      setDetailOpen(false);
      router.push(screenPath(`clients-${next}`));
    },
    [router],
  );

  const data = board.data;
  const leads = useMemo(() => data?.leads ?? [], [data]);
  const now = useMemo(() => new Date(data?.generatedAt ?? 0), [data]);
  const isGone = useCallback(
    (id: string) => undoQueue.exiting.has(id) || undoQueue.hidden.has(id),
    [undoQueue.exiting, undoQueue.hidden],
  );

  const model = (target: ClientView) => {
    const sections = buildSections(target, leads, {
      query: queries[target] ?? "",
      archiveFilter,
      now,
    });
    const nav: Row[] = sections
      .flatMap((section) => section.rows)
      .filter((row) => !isGone(row.lead.id));
    const current = nav.find((row) => row.lead.id === picked[target]) ?? nav[0] ?? null;
    return { sections, nav, current };
  };

  const scrollRowIntoView = (leadId: string) =>
    requestAnimationFrame(() =>
      rootRef.current
        ?.querySelector<HTMLElement>(`.clients-list [data-lead="${leadId}"]`)
        ?.scrollIntoView({ block: "nearest" }),
    );

  const select = (target: ClientView, leadId: string, open = true) => {
    setPicked((current) => ({ ...current, [target]: leadId }));
    if (open) setDetailOpen(true);
    scrollRowIntoView(leadId);
  };

  // move off a lead that is about to leave the list
  const advancePast = (leadId: string) => {
    const { nav } = model(view);
    const index = nav.findIndex((row) => row.lead.id === leadId);
    const next = nav[index + 1] ?? nav[index - 1];
    if (next) select(view, next.lead.id, detailOpen);
    else setDetailOpen(false);
  };

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setActionError(null);
      try {
        await fn();
      } catch (cause) {
        fail(cause);
        throw cause;
      } finally {
        await queryClient.invalidateQueries({ queryKey: clientKeys.board });
      }
    },
    [fail, queryClient],
  );
  const fire = (fn: () => Promise<unknown>) => void run(fn).catch(() => undefined);

  const actions: ClientActions = {
    approve: (lead, draft) => {
      advancePast(lead.id);
      undoQueue.schedule({
        key: lead.id,
        label: `Approved ${lead.business}`,
        commit: (keepalive) =>
          approveDraftRequest(draft.id, draft.version, draft.bodySha256, keepalive),
      });
    },
    drop: (lead, reason, note) => {
      advancePast(lead.id);
      undoQueue.schedule({
        key: lead.id,
        label: `Dropped ${lead.business}`,
        commit: (keepalive) => dropLeadRequest(lead.id, reason, note, keepalive),
      });
    },
    revise: (draft, note) => run(() => reviseDraftRequest(draft.id, note)),
    edit: (draft, subject, body) => run(() => editDraftRequest(draft.id, subject, body)),
    retry: (eventId) => fire(() => retryEventRequest(eventId)),
    hold: (lead) => fire(() => holdLeadRequest(lead.id, "")),
    note: (lead, body) => run(() => noteRequest(lead.id, body)),
    deal: (lead, patch) => run(() => dealRequest(lead.id, patch)),
    tasks: (lead, tasks) => run(() => tasksRequest(lead.id, tasks)),
    won: (lead) => fire(() => leadActionRequest(lead.id, "won")),
    startTalks: (lead) => fire(() => leadActionRequest(lead.id, "in_talks")),
    revive: (lead) => fire(() => leadActionRequest(lead.id, "revive")),
  };

  const setPanel = (leadId: string, panel: CardPanel) =>
    setPanels((current) => ({ ...current, [leadId]: panel }));

  const openInInbox = (leadId: string) => {
    setFocus({ kind: "client-lead", id: leadId });
    setView("inbox");
  };

  // a lead picked in the command palette (or "review follow-up"): select it once
  // its page and the board are rendered
  const focusLeadId = focus?.kind === "client-lead" && data ? focus.id : null;
  useEffect(() => {
    if (!focusLeadId) return;
    const target = leads.find((lead) => lead.id === focusLeadId);
    if (target && viewForLead(target) !== view) return;
    consumeFocus("client-lead");
    if (!target) return;
    requestAnimationFrame(() => {
      setQueries((current) => ({ ...current, [view]: "" }));
      select(view, focusLeadId);
    });
  });

  // keyboard shortcuts read the latest render through refs
  const latest = useRef({ view, model, actions, setPanel, select, detailOpen });
  useLayoutEffect(() => {
    latest.current = { view, model, actions, setPanel, select, detailOpen };
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector("[role=dialog]") && event.key !== "?") return;
      const state = latest.current;
      const key = event.key;
      // digit row or numpad, by physical key, so layouts whose digit row doesn't
      // type "1".."5" without shift still switch pages
      const digit =
        /^(?:Digit|Numpad)([1-5])$/.exec(event.code)?.[1] ?? (/^[1-5]$/.test(key) ? key : null);
      if (digit) {
        event.preventDefault();
        setView(clientViews[Number(digit) - 1]);
        return;
      }
      if (key === "?") {
        event.preventDefault();
        setSheetOpen((open) => !open);
        return;
      }
      if (key === "/") {
        event.preventDefault();
        rootRef.current?.querySelector<HTMLInputElement>("[data-clients-search]")?.focus();
        return;
      }
      if (key === "z") {
        const back = undoQueue.undo();
        if (back) {
          event.preventDefault();
          state.select(state.view, back, state.detailOpen);
        }
        return;
      }
      if (key === "Escape" && state.detailOpen) {
        setDetailOpen(false);
        return;
      }
      const { nav, current } = state.model(state.view);
      if (key === "j" || key === "k" || key === "ArrowDown" || key === "ArrowUp") {
        if (nav.length === 0) return;
        event.preventDefault();
        const index = current ? nav.indexOf(current) : -1;
        const step = key === "j" || key === "ArrowDown" ? 1 : -1;
        const next = nav[Math.max(0, Math.min(nav.length - 1, index + step))];
        state.select(state.view, next.lead.id, state.detailOpen);
        return;
      }
      if (!current || (state.view !== "inbox" && state.view !== "replies")) return;
      const { lead, draft } = current;
      if (state.view === "replies" && lead.onHold) return;
      if (key === "a" && draft?.status === "pending") {
        event.preventDefault();
        state.actions.approve(lead, draft);
      } else if (key === "r" && draft?.status === "pending") {
        event.preventDefault();
        state.setPanel(lead.id, "revise");
      } else if (key === "e" && draft) {
        event.preventDefault();
        state.setPanel(lead.id, "edit");
      } else if (key === "d" && state.view === "inbox") {
        event.preventDefault();
        state.setPanel(lead.id, "drop");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setView, undoQueue]);

  const render = (target: ClientView) => {
    const { sections, current } = model(target);
    const ctx: ViewContext = {
      view: target,
      loading: board.isPending,
      sections,
      current,
      isGone,
      select: (leadId) => select(target, leadId),
      detailOpen,
      closeDetail: () => setDetailOpen(false),
      query: queries[target] ?? "",
      setQuery: (query) => setQueries((value) => ({ ...value, [target]: query })),
      archiveFilter,
      setArchiveFilter,
      panel: (leadId) => panels[leadId] ?? null,
      setPanel,
      actions,
      openInInbox,
      now,
    };
    return <ViewBody ctx={ctx} />;
  };

  return (
    <div ref={rootRef} className="clients-root">
      <ActionErrorBanner error={actionError} onDismiss={() => setActionError(null)} />
      <div className="clients-head" data-testid="clients-head">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">
            {screenTitles[`clients-${view}`]}
          </h1>
          <p className="text-sm text-muted-foreground">{viewSubtitles[view]}</p>
        </div>
        {data ? <Stats stats={data.stats} /> : null}
        <button
          type="button"
          className="hidden text-xs text-muted-foreground hover:text-foreground lg:inline-flex lg:items-center lg:gap-1"
          onClick={() => setSheetOpen(true)}
        >
          <Kbd>?</Kbd> shortcuts
        </button>
      </div>
      {board.isError ? (
        <div
          className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:mx-6"
          role="alert"
        >
          <span>Couldn't load clients.</span>
          <Button size="xs" variant="ghost" onClick={() => void board.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      <section id="clients-view" aria-label={view} className="clients-body">
        <ClientsViewContext.Provider value={{ render, onShown: setShownView }}>
          {children}
        </ClientsViewContext.Provider>
      </section>
      <div aria-live="polite" aria-atomic="true">
        {undoQueue.pending ? (
          <div className="clients-toast" data-leaving={undoQueue.leaving} data-testid="undo-toast">
            <div className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{undoQueue.pending.label}</span>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  const back = undoQueue.undo();
                  if (back) select(view, back, detailOpen);
                }}
              >
                Undo <Kbd>z</Kbd>
              </Button>
            </div>
            <div
              key={undoQueue.pending.key + undoQueue.pending.label}
              className="clients-toast-bar"
              style={{ animationDuration: `${UNDO_MS}ms` }}
            />
          </div>
        ) : null}
      </div>
      <ShortcutSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
