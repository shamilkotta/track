"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Download,
  FileText,
  Filter,
  Mail,
  Paperclip,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import {
  CompanyActivityBadges,
  CompanyActivityList,
  CompanyGroupHeaderRow,
  GroupedItemIndent,
  useCollapsedCompanyGroups,
} from "@/components/company-group-rows";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SavedViewsMenu } from "@/components/saved-views-menu";
import {
  ApplicationFields,
  CompanyMark,
  LeadStatusBadge,
  NativeSelectField,
  PriorityBadge,
  StageBadge,
  WishlistStatusBadge,
} from "@/components/workspace-fields";
import { LeadDetailDrawer } from "@/components/leads-workspace";
import { WishlistDetailDrawer } from "@/components/wishlist-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  emptyFormValues,
  formatCompensation,
  formatDisplayDate,
  formValuesToApplicationPatch,
  isPriority,
  isReplyStatus,
  isSortKey,
  isSource,
  isStage,
  nextStepSummary,
  priorities,
  replyStatuses,
  sortLabels,
  sources,
  stages,
  valuesFromApplication,
  workModes,
  type Application,
  type ApplicationFormValues,
  type ApplicationListItem,
  type Company,
  type CoverLetterListItem,
  type Lead,
  type LeadListItem,
  type Priority,
  type ReplyStatus,
  type Resume,
  type SavedView,
  type SortKey,
  type Source,
  type Stage,
  type Wishlist,
  type WishlistListItem,
  type WorkMode,
} from "@/lib/domain";
import { useApplicationQuery, useCoverLetterQuery } from "@/hooks/use-workspace";
import { groupByCompany } from "@/lib/group-by-company";

type Density = "comfortable" | "compact";

function isDensity(value: string | null): value is Density {
  return value === "comfortable" || value === "compact";
}

function relativeFollowUp(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${iso}T00:00:00`);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDisplayDate(iso);
}

function computeStats(applications: ApplicationListItem[], companies: Company[]) {
  const active = applications.filter((item) => !item.archived);
  const inProgress = active.filter(
    (item) => item.stage === "Screening" || item.stage === "Interview" || item.stage === "Offer",
  );
  const applied = active.filter((item) => item.stage !== "Wishlist");
  const replied = applied.filter((item) => item.replyStatus === "Replied");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = active
    .filter((item) => item.nextStepDate && item.nextStepDate >= today)
    .sort((a, b) => a.nextStepDate.localeCompare(b.nextStepDate))[0];
  const company = upcoming ? companies.find((c) => c.id === upcoming.companyId) : undefined;
  const rate = applied.length === 0 ? 0 : Math.round((replied.length / applied.length) * 100);
  return [
    {
      label: "Active applications",
      value: String(active.length),
      hint: `${applications.length} total including archive`,
    },
    {
      label: "In progress",
      value: String(inProgress.length),
      hint: active.length
        ? `${Math.round((inProgress.length / active.length) * 100)}% of active`
        : "No active roles",
    },
    {
      label: "Response rate",
      value: applied.length ? `${rate}%` : "—",
      hint: `${replied.length} replied of ${applied.length} sent`,
    },
    {
      label: "Next follow-up",
      value: upcoming ? relativeFollowUp(upcoming.nextStepDate) : "None",
      hint: upcoming
        ? `${company?.name ?? "Unknown"}${upcoming.reminderTime !== "None" ? ` · ${upcoming.reminderTime}` : ""}`
        : "No dated next step",
    },
  ];
}

function StatStrip({
  applications,
  companies,
}: {
  applications: ApplicationListItem[];
  companies: Company[];
}) {
  const stats = computeStats(applications, companies);
  return (
    <div className="track-stat-strip mx-4 mb-6 md:mx-7">
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="track-stat-label">{stat.label}</p>
          <p className="track-stat-value">{stat.value}</p>
          <p className="track-stat-detail">{stat.hint}</p>
        </div>
      ))}
    </div>
  );
}

function DetailDrawer({
  id,
  company,
  companies,
  resumes,
  coverLetters,
  open,
  onOpenChange,
  onPatch,
  onDelete,
  onRestore,
  readOnly = false,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
}: {
  id: string;
  company: Company | undefined;
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetterListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (id: string, patch: Partial<Application>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore?: () => Promise<void>;
  readOnly?: boolean;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
}) {
  const { data: item, isPending, isError, error } = useApplicationQuery(open ? id : null);
  const [draft, setDraft] = useState<ApplicationFormValues | null>(null);
  const [draftSourceId, setDraftSourceId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (item && draftSourceId !== item.id) {
    setDraftSourceId(item.id);
    setDraft(valuesFromApplication(item));
  } else if (!item && draftSourceId !== null) {
    setDraftSourceId(null);
    setDraft(null);
  }

  function setValues(patch: Partial<ApplicationFormValues>) {
    if (readOnly || !draft) return;
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function flashSaved() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }

  function patchImmediate(patch: Partial<Application>) {
    if (readOnly || !item) return;
    void onPatch(item.id, patch).then(flashSaved);
  }

  function saveAll() {
    if (readOnly || !draft || !item) return;
    const patch = formValuesToApplicationPatch(draft);
    if (!patch) return;
    void onPatch(item.id, patch).then(flashSaved);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b">
            <SheetTitle className="flex items-center gap-2">
              Application details
              {savedFlash && (
                <span className="text-xs font-normal text-muted-foreground">Saved</span>
              )}
            </SheetTitle>
            <SheetDescription>
              {company?.name ?? "Unknown"}
              {item ? ` · ${item.role}` : ""}
              {readOnly ? " · Archived" : ""}
            </SheetDescription>
          </SheetHeader>
          {isPending || !item || !draft ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              {isError
                ? error instanceof Error
                  ? error.message
                  : "Could not load application"
                : "Loading details…"}
            </p>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div {...(readOnly ? { inert: true } : {})}>
                  <div className="flex items-start gap-3 px-4 pt-4">
                    {company && <CompanyMark logo={company.logo} color={company.color} large />}
                    <div className="min-w-0">
                      <p className="font-semibold">{company?.name ?? "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{draft.role}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 pt-4">
                    <Field>
                      <FieldLabel>Status</FieldLabel>
                      <NativeSelectField
                        value={draft.stage}
                        onChange={(stage) => {
                          setValues({ stage });
                          patchImmediate({ stage });
                        }}
                        options={stages}
                        guard={isStage}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Priority</FieldLabel>
                      <NativeSelectField
                        value={draft.priority}
                        onChange={(priority) => {
                          setValues({ priority });
                          patchImmediate({ priority });
                        }}
                        options={priorities}
                        guard={isPriority}
                      />
                    </Field>
                    <Field className="col-span-2">
                      <FieldLabel>Reply status</FieldLabel>
                      <NativeSelectField
                        value={draft.replyStatus}
                        onChange={(replyStatus) => {
                          setValues({ replyStatus });
                          patchImmediate({ replyStatus });
                        }}
                        options={replyStatuses}
                        guard={isReplyStatus}
                      />
                    </Field>
                  </div>
                  <div className="p-4">
                    <ApplicationFields
                      companies={companies}
                      resumes={resumes}
                      coverLetters={coverLetters}
                      values={draft}
                      setValues={(patch) => {
                        setValues(patch);
                        const immediateKeys = [
                          "workMode",
                          "resumeId",
                          "coverLetterId",
                          "replyStatus",
                          "source",
                          "jobType",
                          "reminderTime",
                        ] as const;
                        const immediate: Partial<Application> = {};
                        for (const key of immediateKeys) {
                          if (key in patch) {
                            Object.assign(immediate, { [key]: patch[key] });
                          }
                        }
                        if (Object.keys(immediate).length > 0) patchImmediate(immediate);
                      }}
                      onCreateCompany={onCreateCompany}
                      onUploadResume={onUploadResume}
                      onCreateCoverText={onCreateCoverText}
                      onUploadCover={onUploadCover}
                    />
                  </div>
                </div>
              </div>
              <SheetFooter className="shrink-0 border-t">
                <p className="mr-auto text-xs text-muted-foreground">
                  Applied {formatDisplayDate(item.appliedDate)}
                  {formatCompensation(item) !== "—" && ` · ${formatCompensation(item)}`}
                </p>
                <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
                {readOnly ? (
                  <Button onClick={() => void onRestore?.()}>Restore</Button>
                ) : (
                  <Button onClick={saveAll}>Save changes</Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this application?"
        description="This permanently removes the application. This cannot be undone."
        onConfirm={() => onDelete(id)}
      />
    </>
  );
}

export function ApplicationsView({
  applications,
  companies,
  resumes,
  coverLetters,
  savedViews,
  year,
  setYear,
  density,
  setDensity,
  groupByCompany: groupByCompanyEnabled,
  setGroupByCompany,
  focusId = null,
  onFocusConsumed,
  onAdd,
  onPatch,
  onDelete,
  onBulk,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
  onSaveView,
  onDeleteView,
  onApplyView,
}: {
  applications: ApplicationListItem[];
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetterListItem[];
  savedViews: SavedView[];
  year: string;
  setYear: (year: string) => void;
  density: Density;
  setDensity: (density: Density) => void;
  groupByCompany: boolean;
  setGroupByCompany: (value: boolean) => void;
  focusId?: string | null;
  onFocusConsumed?: () => void;
  onAdd: () => void;
  onPatch: (id: string, patch: Partial<Application>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulk: (ids: string[], action: "archive" | "delete") => Promise<void>;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
  onSaveView: (view: Omit<SavedView, "id">) => Promise<void>;
  onDeleteView: (id: string) => Promise<void>;
  onApplyView: (view: SavedView) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Stage>("All");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [selectedReplies, setSelectedReplies] = useState<ReplyStatus[]>([]);
  const [selectedModes, setSelectedModes] = useState<WorkMode[]>([]);
  const [selectedSources, setSelectedSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const { isCollapsed, toggle } = useCollapsedCompanyGroups({ defaultCollapsed: true });
  const activeId = focusId ?? localActiveId;

  function setActiveId(id: string | null) {
    if (focusId) onFocusConsumed?.();
    setLocalActiveId(id);
  }

  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );

  const years = useMemo(() => {
    const values = new Set(
      applications
        .map((item) => item.appliedDate.slice(0, 4))
        .filter((value) => value.length === 4),
    );
    return [...values].sort().reverse();
  }, [applications]);

  const extraFilterCount =
    selectedPriorities.length +
    selectedReplies.length +
    selectedModes.length +
    selectedSources.length;

  const filtered = useMemo(() => {
    const rows = applications.filter((a) => {
      const company = companyById[a.companyId];
      const hay = `${company?.name ?? ""} ${a.role} ${a.tags.join(" ")}`.toLowerCase();
      if (filter !== "All" && a.stage !== filter) return false;
      if (year !== "all" && a.appliedDate.slice(0, 4) !== year) return false;
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(a.priority)) return false;
      if (selectedReplies.length > 0 && !selectedReplies.includes(a.replyStatus)) return false;
      if (selectedModes.length > 0 && !selectedModes.includes(a.workMode)) return false;
      if (selectedSources.length > 0 && !selectedSources.includes(a.source)) return false;
      return hay.includes(query.toLowerCase());
    });
    const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
    const stageRank = Object.fromEntries(stages.map((stage, index) => [stage, index]));
    rows.sort((a, b) => {
      if (sort === "company") {
        return (companyById[a.companyId]?.name ?? "").localeCompare(
          companyById[b.companyId]?.name ?? "",
        );
      }
      if (sort === "stage") return (stageRank[a.stage] ?? 0) - (stageRank[b.stage] ?? 0);
      if (sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
      return b.appliedDate.localeCompare(a.appliedDate) || b.createdAt.localeCompare(a.createdAt);
    });
    return rows;
  }, [
    applications,
    companyById,
    filter,
    query,
    selectedModes,
    selectedPriorities,
    selectedReplies,
    selectedSources,
    sort,
    year,
  ]);

  const companyGroups = useMemo(
    () => (groupByCompanyEnabled ? groupByCompany(filtered, companyById) : []),
    [companyById, filtered, groupByCompanyEnabled],
  );

  const active = applications.find((a) => a.id === activeId) ?? null;
  const currentYear = new Date().getFullYear().toString();

  function toggleFilter<T extends string>(list: T[], value: T, setList: (next: T[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return (
    <>
      <div className="track-page-header">
        <div>
          <h1>What needs attention</h1>
          <p className="track-page-lede">
            Active applications, response rate, and the next dated follow-up.
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
              <SlidersHorizontal />
              <span className="sr-only">View options</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuRadioGroup
                value={density}
                onValueChange={(value) => {
                  if (isDensity(value)) setDensity(value);
                }}
              >
                <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                  Row density
                </div>
                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setGroupByCompany(!groupByCompanyEnabled)}
                className="justify-between"
              >
                Group by company
                {groupByCompanyEnabled && <Badge variant="secondary">On</Badge>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onAdd}>
            <Plus /> New application
          </Button>
        </div>
      </div>
      <StatStrip applications={applications} companies={companies} />
      <div className="track-toolbar">
        <div className="relative min-w-[180px] flex-1 md:max-w-xs">
          <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications..."
            className="pl-8"
            aria-label="Search applications"
          />
        </div>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            <Filter />
            Filters
            {extraFilterCount > 0 && <Badge variant="secondary">{extraFilterCount}</Badge>}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <PopoverHeader>
              <PopoverTitle>Filters</PopoverTitle>
            </PopoverHeader>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Priority</p>
                <div className="flex flex-wrap gap-1">
                  {priorities.map((priority) => (
                    <Button
                      key={priority}
                      size="xs"
                      variant={selectedPriorities.includes(priority) ? "default" : "outline"}
                      onClick={() =>
                        toggleFilter(selectedPriorities, priority, setSelectedPriorities)
                      }
                    >
                      {priority}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Reply</p>
                <div className="flex flex-wrap gap-1">
                  {replyStatuses.map((status) => (
                    <Button
                      key={status}
                      size="xs"
                      variant={selectedReplies.includes(status) ? "default" : "outline"}
                      onClick={() => toggleFilter(selectedReplies, status, setSelectedReplies)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Work mode</p>
                <div className="flex flex-wrap gap-1">
                  {workModes.map((mode) => (
                    <Button
                      key={mode}
                      size="xs"
                      variant={selectedModes.includes(mode) ? "default" : "outline"}
                      onClick={() => toggleFilter(selectedModes, mode, setSelectedModes)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Source</p>
                <div className="flex flex-wrap gap-1">
                  {sources.map((source) => (
                    <Button
                      key={source}
                      size="xs"
                      variant={selectedSources.includes(source) ? "default" : "outline"}
                      onClick={() => toggleFilter(selectedSources, source, setSelectedSources)}
                    >
                      {source}
                    </Button>
                  ))}
                </div>
              </div>
              {extraFilterCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedPriorities([]);
                    setSelectedReplies([]);
                    setSelectedModes([]);
                    setSelectedSources([]);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Select
          value={filter}
          onValueChange={(value) => {
            if (value === "All" || isStage(value)) setFilter(value);
          }}
        >
          <SelectTrigger aria-label="Filter by stage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={year}
          onValueChange={(value) => {
            if (value) setYear(value);
          }}
        >
          <SelectTrigger aria-label="Filter by year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {!years.includes(currentYear) && (
              <SelectItem value={currentYear}>{currentYear}</SelectItem>
            )}
            {years.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" className="text-muted-foreground" />}
          >
            <ArrowDownUp />
            Sort: {sortLabels[sort]}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => {
                if (isSortKey(value)) setSort(value);
              }}
            >
              {Object.entries(sortLabels).map(([key, label]) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <SavedViewsMenu
          views={savedViews}
          current={{
            screen: "applications",
            query,
            stage: filter,
            sort,
            priorities: selectedPriorities,
            replyStatuses: selectedReplies,
            workModes: selectedModes,
            sources: selectedSources,
            year,
          }}
          onSave={onSaveView}
          onDelete={onDeleteView}
          onApply={(view) => {
            setQuery(view.query);
            if (view.stage === "All" || isStage(view.stage)) setFilter(view.stage);
            if (isSortKey(view.sort)) setSort(view.sort);
            setSelectedPriorities(view.priorities);
            setSelectedReplies(view.replyStatuses);
            setSelectedModes(view.workModes);
            setSelectedSources(view.sources.filter(isSource));
            setYear(view.year);
            onApplyView(view);
          }}
        />
        {selected.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              onClick={() => {
                void onBulk(selected, "archive").then(() => setSelected([]));
              }}
            >
              Archive
            </Button>
            <Button variant="outline" onClick={() => setConfirmBulkDelete(true)}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setSelected([])}>
              {selected.length} selected <X />
            </Button>
          </div>
        )}
        <Button className="ml-auto md:hidden" onClick={onAdd}>
          <Plus /> New
        </Button>
      </div>
      <Table>
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead className="w-10 pl-4 pr-0" />
            <TableHead>Company / role</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Next step</TableHead>
            <TableHead>Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupByCompanyEnabled
            ? companyGroups.flatMap((group) => {
                const groupSelected = group.items.filter((item) => selected.includes(item.id));
                const renderRow = (item: ApplicationListItem, grouped: boolean) => {
                  const company = companyById[item.companyId];
                  return (
                    <TableRow
                      key={item.id}
                      data-state={activeId === item.id ? "selected" : undefined}
                      className={density === "compact" ? "[&>td]:py-1.5" : undefined}
                    >
                      <TableCell className="w-10 pl-4 pr-0">
                        <Checkbox
                          className="after:inset-0"
                          checked={selected.includes(item.id)}
                          onCheckedChange={(checked) => {
                            setSelected(
                              checked
                                ? [...selected, item.id]
                                : selected.filter((id) => id !== item.id),
                            );
                          }}
                          aria-label={`Select ${company?.name ?? "application"}`}
                        />
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => setActiveId(item.id)}>
                        {grouped ? (
                          <GroupedItemIndent>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.role}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.location || item.workMode}
                              </p>
                            </div>
                          </GroupedItemIndent>
                        ) : (
                          <div className="flex min-w-0 items-center gap-3">
                            {company && <CompanyMark logo={company.logo} color={company.color} />}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{company?.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className="hidden cursor-pointer md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        <StageBadge stage={item.stage} />
                      </TableCell>
                      <TableCell
                        className="hidden cursor-pointer text-muted-foreground md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        {formatDisplayDate(item.appliedDate)}
                      </TableCell>
                      <TableCell
                        className="hidden max-w-[140px] cursor-pointer truncate text-muted-foreground md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        {nextStepSummary(item)}
                      </TableCell>
                      <TableCell
                        className="hidden cursor-pointer md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        <PriorityBadge priority={item.priority} />
                      </TableCell>
                    </TableRow>
                  );
                };

                if (group.items.length === 1) {
                  return renderRow(group.items[0]!, false);
                }

                const collapsed = isCollapsed(group.companyId);
                return [
                  <CompanyGroupHeaderRow
                    key={`group-${group.companyId}`}
                    company={group.company}
                    count={group.items.length}
                    label="applications"
                    collapsed={collapsed}
                    onToggle={() => toggle(group.companyId)}
                    selectedCount={groupSelected.length}
                    onSelectAll={(checked) => {
                      const ids = group.items.map((item) => item.id);
                      setSelected((prev) =>
                        checked
                          ? [...new Set([...prev, ...ids])]
                          : prev.filter((id) => !ids.includes(id)),
                      );
                    }}
                  />,
                  ...(collapsed ? [] : group.items.map((item) => renderRow(item, true))),
                ];
              })
            : filtered.map((item) => {
                const company = companyById[item.companyId];
                return (
                  <TableRow
                    key={item.id}
                    data-state={activeId === item.id ? "selected" : undefined}
                    className={density === "compact" ? "[&>td]:py-1.5" : undefined}
                  >
                    <TableCell className="w-10 pl-4 pr-0">
                      <Checkbox
                        className="after:inset-0"
                        checked={selected.includes(item.id)}
                        onCheckedChange={(checked) => {
                          setSelected(
                            checked
                              ? [...selected, item.id]
                              : selected.filter((id) => id !== item.id),
                          );
                        }}
                        aria-label={`Select ${company?.name ?? "application"}`}
                      />
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => setActiveId(item.id)}>
                      <div className="flex min-w-0 items-center gap-3">
                        {company && <CompanyMark logo={company.logo} color={company.color} />}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{company?.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell
                      className="hidden cursor-pointer md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      <StageBadge stage={item.stage} />
                    </TableCell>
                    <TableCell
                      className="hidden cursor-pointer text-muted-foreground md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      {formatDisplayDate(item.appliedDate)}
                    </TableCell>
                    <TableCell
                      className="hidden max-w-[140px] cursor-pointer truncate text-muted-foreground md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      {nextStepSummary(item)}
                    </TableCell>
                    <TableCell
                      className="hidden cursor-pointer md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      <PriorityBadge priority={item.priority} />
                    </TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Search className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">No applications found</p>
          <p className="text-xs text-muted-foreground">Try a different search or filter.</p>
        </div>
      )}
      {active && (
        <DetailDrawer
          key={active.id}
          id={active.id}
          company={companyById[active.companyId]}
          companies={companies}
          resumes={resumes}
          coverLetters={coverLetters}
          open
          onOpenChange={(open) => {
            if (!open) setActiveId(null);
          }}
          onPatch={onPatch}
          onDelete={async (id) => {
            await onDelete(id);
            setActiveId(null);
            setSelected((prev) => prev.filter((selectedId) => selectedId !== id));
          }}
          onCreateCompany={onCreateCompany}
          onUploadResume={onUploadResume}
          onCreateCoverText={onCreateCoverText}
          onUploadCover={onUploadCover}
        />
      )}
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Delete ${selected.length} application${selected.length === 1 ? "" : "s"}?`}
        description="Selected applications will be permanently removed. This cannot be undone."
        onConfirm={async () => {
          await onBulk(selected, "delete");
          setSelected([]);
        }}
      />
    </>
  );
}

export function CompaniesView({
  companies,
  applications,
  leads,
  focusId = null,
  onFocusConsumed,
  onCreate,
  onPatch,
  onDelete,
  onOpenApplication,
  onOpenLead,
}: {
  companies: Company[];
  applications: ApplicationListItem[];
  leads: LeadListItem[];
  focusId?: string | null;
  onFocusConsumed?: () => void;
  onCreate: (name: string, extra?: { website?: string }) => Promise<string>;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenApplication: (id: string) => void;
  onOpenLead: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const activeId = focusId ?? localActiveId;
  const active = companies.find((c) => c.id === activeId) ?? null;
  const [dirtyDraft, setDirtyDraft] = useState<{
    id: string;
    name: string;
    website: string;
    location: string;
    logo: string;
  } | null>(null);

  function setActiveId(id: string | null) {
    if (focusId) onFocusConsumed?.();
    setLocalActiveId(id);
    if (id === null) setDirtyDraft(null);
  }

  const draft =
    active && dirtyDraft?.id === active.id
      ? dirtyDraft
      : active
        ? {
            id: active.id,
            name: active.name,
            website: active.website,
            location: active.location,
            logo: active.logo,
          }
        : { id: "", name: "", website: "", location: "", logo: "" };

  const activityByCompany = useMemo(() => {
    const map = new Map<string, { applications: ApplicationListItem[]; leads: LeadListItem[] }>();
    for (const company of companies) {
      map.set(company.id, { applications: [], leads: [] });
    }
    for (const item of applications) {
      const bucket = map.get(item.companyId);
      if (bucket) bucket.applications.push(item);
    }
    for (const item of leads) {
      const bucket = map.get(item.companyId);
      if (bucket) bucket.leads.push(item);
    }
    return map;
  }, [applications, companies, leads]);

  function resetCreate() {
    setNewName("");
    setNewWebsite("");
    setCreating(false);
  }

  return (
    <>
      <div className="track-page-header">
        <div>
          <h1>Companies</h1>
          <p className="track-page-lede">
            Shared across applications and leads. Related entries are grouped here.
          </p>
        </div>
        <Popover
          open={creating}
          onOpenChange={(open) => {
            setCreating(open);
            if (!open) {
              setNewName("");
              setNewWebsite("");
            }
          }}
        >
          <PopoverTrigger render={<Button />}>
            <Plus /> New company
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 gap-3 p-3">
            <PopoverHeader>
              <PopoverTitle>New company</PopoverTitle>
              <PopoverDescription>Name and optional website URL.</PopoverDescription>
            </PopoverHeader>
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Acme Inc."
                />
              </Field>
              <Field>
                <FieldLabel>Website</FieldLabel>
                <Input
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://acme.com"
                  type="url"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetCreate}>
                  Cancel
                </Button>
                <Button
                  disabled={!newName.trim() || savingCreate}
                  onClick={() => {
                    setSavingCreate(true);
                    void onCreate(newName.trim(), {
                      website: newWebsite.trim() || undefined,
                    })
                      .then(resetCreate)
                      .finally(() => setSavingCreate(false));
                  }}
                >
                  Save company
                </Button>
              </div>
            </FieldGroup>
          </PopoverContent>
        </Popover>
      </div>
      <div className="px-4 pb-8 md:px-7">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => {
              const activity = activityByCompany.get(c.id);
              return (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setActiveId(c.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <CompanyMark logo={c.logo} color={c.color} />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CompanyActivityBadges
                      applicationCount={activity?.applications.length ?? 0}
                      leadCount={activity?.leads.length ?? 0}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.location || "—"}</TableCell>
                  <TableCell>
                    {c.website ? (
                      <a
                        href={c.website}
                        className="text-muted-foreground hover:text-foreground"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {c.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {companies.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No companies yet. Add one here or while creating an application.
          </p>
        )}
        <Sheet
          open={active !== null}
          onOpenChange={(open) => {
            if (!open) setActiveId(null);
          }}
        >
          <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
            <SheetHeader className="border-b">
              <SheetTitle>Edit company</SheetTitle>
              <SheetDescription>Shared across every application for this company.</SheetDescription>
            </SheetHeader>
            {active && (
              <div className="flex flex-1 flex-col gap-4 p-4">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    value={draft.name}
                    onChange={(e) =>
                      setDirtyDraft({ ...draft, id: active.id, name: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Logo letter</FieldLabel>
                  <Input
                    value={draft.logo}
                    onChange={(e) =>
                      setDirtyDraft({ ...draft, id: active.id, logo: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Location</FieldLabel>
                  <Input
                    value={draft.location}
                    onChange={(e) =>
                      setDirtyDraft({ ...draft, id: active.id, location: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Website</FieldLabel>
                  <Input
                    type="url"
                    value={draft.website}
                    onChange={(e) =>
                      setDirtyDraft({ ...draft, id: active.id, website: e.target.value })
                    }
                  />
                </Field>
                <div>
                  <p className="mb-2 text-sm font-medium">Related entries</p>
                  <CompanyActivityList
                    applications={activityByCompany.get(active.id)?.applications ?? []}
                    leads={activityByCompany.get(active.id)?.leads ?? []}
                    onOpenApplication={onOpenApplication}
                    onOpenLead={onOpenLead}
                  />
                </div>
              </div>
            )}
            <SheetFooter className="border-t">
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button
                onClick={() => {
                  if (!active) return;
                  void onPatch(active.id, {
                    name: draft.name,
                    website: draft.website,
                    location: draft.location,
                    logo: draft.logo,
                  }).then(() => setActiveId(null));
                }}
              >
                Save changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this company?"
        description="The company will be permanently removed if it is not used by any applications or leads."
        onConfirm={async () => {
          if (!active) return;
          await onDelete(active.id);
          setActiveId(null);
        }}
      />
    </>
  );
}

export function ResumesView({
  resumes,
  applications,
  companies,
  onUpload,
  onRename,
  onDelete,
}: {
  resumes: Resume[];
  applications: ApplicationListItem[];
  companies: Company[];
  onUpload: (file: File) => Promise<string>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const active = resumes.find((r) => r.id === activeId) ?? null;
  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );
  const usedBy = active ? applications.filter((a) => a.resumeId === active.id) : [];

  return (
    <>
      <div className="track-page-header">
        <div>
          <h1>Resumes</h1>
          <p className="track-page-lede">Open any resume to see the file and where it is used.</p>
        </div>
        <Button onClick={() => fileRef.current?.click()}>
          <Upload /> Upload resume
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
      <div className="px-4 pb-8 md:px-7">
        <div className="flex flex-col gap-2">
          {resumes.map((r) => {
            const count = applications.filter((a) => a.resumeId === r.id).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setActiveId(r.id);
                  setName(r.name);
                }}
                className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent/50"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.fileName}</p>
                </div>
                <Badge variant="secondary">
                  {count} {count === 1 ? "application" : "applications"}
                </Badge>
              </button>
            );
          })}
        </div>
        {resumes.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Upload a PDF or Word resume to attach it to applications.
          </p>
        )}
        <Sheet
          open={active !== null}
          onOpenChange={(open) => {
            if (!open) setActiveId(null);
          }}
        >
          <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
            <SheetHeader className="border-b">
              <SheetTitle>{active?.name ?? "Resume"}</SheetTitle>
              <SheetDescription>Full resume details</SheetDescription>
            </SheetHeader>
            {active && (
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-5 p-4">
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <FileText className="mt-0.5 size-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium">{active.fileName}</p>
                      <a
                        href={`/resumes/${active.id}/file`}
                        className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="size-3.5" />
                        Open file
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Used in applications
                    </p>
                    {usedBy.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Not attached to any application yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {usedBy.map((app) => {
                          const company = companyById[app.companyId];
                          return (
                            <div
                              key={app.id}
                              className="flex items-center gap-3 rounded-lg border px-3 py-2"
                            >
                              {company && <CompanyMark logo={company.logo} color={company.color} />}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {company?.name ?? "Unknown"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{app.role}</p>
                              </div>
                              <StageBadge stage={app.stage} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
            <SheetFooter className="border-t">
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button
                onClick={() => {
                  if (active) void onRename(active.id, name);
                }}
              >
                Save changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this resume?"
        description="The resume file will be permanently removed. This cannot be undone."
        onConfirm={async () => {
          if (!active) return;
          await onDelete(active.id);
          setActiveId(null);
        }}
      />
    </>
  );
}

export function CoverLettersView({
  coverLetters,
  applications,
  companies,
  onCreateText,
  onUpload,
  onPatch,
  onDelete,
}: {
  coverLetters: CoverLetterListItem[];
  applications: ApplicationListItem[];
  companies: Company[];
  onCreateText: (name: string, body: string) => Promise<string>;
  onUpload: (file: File) => Promise<string>;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const listActive = coverLetters.find((c) => c.id === activeId) ?? null;
  const { data: activeDetail, isPending: detailPending } = useCoverLetterQuery(activeId);
  const active = activeDetail ?? listActive;
  const [editName, setEditName] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );
  const usedBy = active ? applications.filter((a) => a.coverLetterId === active.id) : [];

  if (activeDetail && editSourceId !== activeDetail.id) {
    setEditSourceId(activeDetail.id);
    setEditName(activeDetail.name);
    setEditBody(activeDetail.kind === "text" ? activeDetail.body : "");
  } else if (!activeDetail && editSourceId !== null && !activeId) {
    setEditSourceId(null);
    setEditName("");
    setEditBody("");
  }

  return (
    <>
      <div className="track-page-header">
        <div>
          <h1>Cover letters</h1>
          <p className="track-page-lede">Open any letter to read the full text or file details.</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover
            open={writing}
            onOpenChange={(open) => {
              setWriting(open);
              if (!open) {
                setDraftName("");
                setDraftBody("");
              }
            }}
          >
            <PopoverTrigger render={<Button />}>
              <Pencil /> Write cover letter
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-3 p-3">
              <PopoverHeader>
                <PopoverTitle>Write cover letter</PopoverTitle>
                <PopoverDescription>Save reusable letter text.</PopoverDescription>
              </PopoverHeader>
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
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftName("");
                      setDraftBody("");
                      setWriting(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!draftName.trim() || !draftBody.trim()}
                    onClick={() => {
                      void onCreateText(draftName.trim(), draftBody.trim()).then(() => {
                        setDraftName("");
                        setDraftBody("");
                        setWriting(false);
                      });
                    }}
                  >
                    Save cover letter
                  </Button>
                </div>
              </FieldGroup>
            </PopoverContent>
          </Popover>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload /> Upload cover letter
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
      <div className="px-4 pb-8 md:px-7">
        <div className="flex flex-col gap-2">
          {coverLetters.map((c) => {
            const count = applications.filter((a) => a.coverLetterId === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveId(c.id);
                  setEditName(c.name);
                  setEditBody("");
                }}
                className="flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent/50"
              >
                {c.kind === "file" ? (
                  <Paperclip className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {c.kind === "file" ? c.fileName : "Text cover letter"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="secondary">{c.kind === "file" ? "File" : "Text"}</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {count} {count === 1 ? "use" : "uses"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {coverLetters.length === 0 && !writing && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Write a letter or upload a file to reuse it across applications.
          </p>
        )}
        <Sheet
          open={active !== null}
          onOpenChange={(open) => {
            if (!open) setActiveId(null);
          }}
        >
          <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
            <SheetHeader className="border-b">
              <SheetTitle>{active?.name ?? "Cover letter"}</SheetTitle>
              <SheetDescription>
                {active?.kind === "file" ? "Uploaded file" : "Full letter text"}
              </SheetDescription>
            </SheetHeader>
            {active && (
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-5 p-4">
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </Field>
                  <div className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      {active.kind === "file" ? (
                        <Paperclip className="size-4 text-muted-foreground" />
                      ) : (
                        <Mail className="size-4 text-muted-foreground" />
                      )}
                      <Badge variant="secondary">{active.kind === "file" ? "File" : "Text"}</Badge>
                    </div>
                    {active.kind === "file" ? (
                      <div>
                        <p className="font-medium">{active.fileName}</p>
                        <a
                          href={`/cover-letters/${active.id}/file`}
                          className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="size-3.5" />
                          Open file
                        </a>
                      </div>
                    ) : detailPending ? (
                      <p className="text-sm text-muted-foreground">Loading letter…</p>
                    ) : (
                      <Textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="min-h-40"
                      />
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Used in applications
                    </p>
                    {usedBy.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Not attached to any application yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {usedBy.map((app) => {
                          const company = companyById[app.companyId];
                          return (
                            <div
                              key={app.id}
                              className="flex items-center gap-3 rounded-lg border px-3 py-2"
                            >
                              {company && <CompanyMark logo={company.logo} color={company.color} />}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {company?.name ?? "Unknown"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{app.role}</p>
                              </div>
                              <StageBadge stage={app.stage} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
            <SheetFooter className="border-t">
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button
                onClick={() => {
                  if (!active) return;
                  void onPatch(active.id, {
                    name: editName,
                    body: active.kind === "text" ? editBody : undefined,
                  });
                }}
              >
                Save changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this cover letter?"
        description="The cover letter will be permanently removed. This cannot be undone."
        onConfirm={async () => {
          if (!active) return;
          await onDelete(active.id);
          setActiveId(null);
        }}
      />
    </>
  );
}

export function ArchiveView({
  applications,
  leads,
  wishlists,
  companies,
  resumes,
  coverLetters,
  focusId = null,
  focusKind = null,
  onFocusConsumed,
  onPatchApplication,
  onDeleteApplication,
  onRestoreApplications,
  onPatchLead,
  onDeleteLead,
  onRestoreLeads,
  onPatchWishlist,
  onDeleteWishlist,
  onRestoreWishlists,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
}: {
  applications: ApplicationListItem[];
  leads: LeadListItem[];
  wishlists: WishlistListItem[];
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetterListItem[];
  focusId?: string | null;
  focusKind?: "application" | "lead" | "wishlist" | null;
  onFocusConsumed?: () => void;
  onPatchApplication: (id: string, patch: Partial<Application>) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
  onRestoreApplications: (ids: string[]) => Promise<void>;
  onPatchLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onRestoreLeads: (ids: string[]) => Promise<void>;
  onPatchWishlist: (id: string, patch: Partial<Wishlist>) => Promise<void>;
  onDeleteWishlist: (id: string) => Promise<void>;
  onRestoreWishlists: (ids: string[]) => Promise<void>;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
}) {
  const [localActive, setLocalActive] = useState<
    | { kind: "application"; id: string }
    | { kind: "lead"; id: string }
    | { kind: "wishlist"; id: string }
    | null
  >(null);
  const active = focusId && focusKind ? { kind: focusKind, id: focusId } : localActive;

  function setActive(
    next:
      | { kind: "application"; id: string }
      | { kind: "lead"; id: string }
      | { kind: "wishlist"; id: string }
      | null,
  ) {
    if (focusId) onFocusConsumed?.();
    setLocalActive(next);
  }
  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );
  const activeApplication =
    active?.kind === "application"
      ? (applications.find((item) => item.id === active.id) ?? null)
      : null;
  const activeLead =
    active?.kind === "lead" ? (leads.find((item) => item.id === active.id) ?? null) : null;
  const activeWishlist =
    active?.kind === "wishlist" ? (wishlists.find((item) => item.id === active.id) ?? null) : null;
  const isEmpty = applications.length === 0 && leads.length === 0 && wishlists.length === 0;

  const archivedItems = useMemo(() => {
    type ArchivedItem =
      | { kind: "application"; item: ApplicationListItem; sortAt: string }
      | { kind: "lead"; item: LeadListItem; sortAt: string }
      | { kind: "wishlist"; item: WishlistListItem; sortAt: string };

    const rows: ArchivedItem[] = [
      ...applications.map((item) => ({
        kind: "application" as const,
        item,
        sortAt: item.updatedAt || item.createdAt,
      })),
      ...leads.map((item) => ({
        kind: "lead" as const,
        item,
        sortAt: item.updatedAt || item.createdAt,
      })),
      ...wishlists.map((item) => ({
        kind: "wishlist" as const,
        item,
        sortAt: item.updatedAt || item.createdAt,
      })),
    ];

    return rows.sort((a, b) => b.sortAt.localeCompare(a.sortAt));
  }, [applications, leads, wishlists]);

  return (
    <div className="px-4 pb-8 pt-7 md:px-7">
      <div className="mb-8">
        <h1>Archive</h1>
        <p className="track-page-lede">Closed applications, leads, and wishlist items land here.</p>
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">Nothing archived yet.</p>
      ) : (
        <div className="flex flex-col gap-0 divide-y border-y">
          {archivedItems.map((row) => {
            if (row.kind === "application") {
              const item = row.item;
              const company = companyById[item.companyId];
              return (
                <div key={`application-${item.id}`} className="flex items-center gap-3 px-1 py-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => setActive({ kind: "application", id: item.id })}
                  >
                    {company && <CompanyMark logo={company.logo} color={company.color} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{company?.name ?? "Unknown"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Application · {item.role}
                      </p>
                    </div>
                    <StageBadge stage={item.stage} />
                  </button>
                  <Button variant="outline" onClick={() => void onRestoreApplications([item.id])}>
                    Restore
                  </Button>
                </div>
              );
            }

            if (row.kind === "lead") {
              const item = row.item;
              const company = companyById[item.companyId];
              return (
                <div key={`lead-${item.id}`} className="flex items-center gap-3 px-1 py-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => setActive({ kind: "lead", id: item.id })}
                  >
                    {company && <CompanyMark logo={company.logo} color={company.color} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{company?.name ?? "Unknown"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Lead · {item.personName}
                        {item.personRole ? ` · ${item.personRole}` : ""}
                      </p>
                    </div>
                    <LeadStatusBadge status={item.status} />
                  </button>
                  <Button variant="outline" onClick={() => void onRestoreLeads([item.id])}>
                    Restore
                  </Button>
                </div>
              );
            }

            const item = row.item;
            const company = companyById[item.companyId];
            return (
              <div key={`wishlist-${item.id}`} className="flex items-center gap-3 px-1 py-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setActive({ kind: "wishlist", id: item.id })}
                >
                  {company && <CompanyMark logo={company.logo} color={company.color} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{company?.name ?? "Unknown"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Wishlist · {item.interest || "No interest noted"}
                    </p>
                  </div>
                  <WishlistStatusBadge status={item.status} />
                </button>
                <Button variant="outline" onClick={() => void onRestoreWishlists([item.id])}>
                  Restore
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {activeApplication && (
        <DetailDrawer
          key={activeApplication.id}
          id={activeApplication.id}
          company={companyById[activeApplication.companyId]}
          companies={companies}
          resumes={resumes}
          coverLetters={coverLetters}
          open
          readOnly
          onOpenChange={(open) => {
            if (!open) setActive(null);
          }}
          onPatch={onPatchApplication}
          onDelete={async (id) => {
            await onDeleteApplication(id);
            setActive(null);
          }}
          onRestore={async () => {
            await onRestoreApplications([activeApplication.id]);
            setActive(null);
          }}
          onCreateCompany={onCreateCompany}
          onUploadResume={onUploadResume}
          onCreateCoverText={onCreateCoverText}
          onUploadCover={onUploadCover}
        />
      )}
      {activeLead && (
        <LeadDetailDrawer
          key={activeLead.id}
          id={activeLead.id}
          company={companyById[activeLead.companyId]}
          companies={companies}
          resumes={resumes}
          coverLetters={coverLetters}
          open
          readOnly
          onOpenChange={(open) => {
            if (!open) setActive(null);
          }}
          onPatch={onPatchLead}
          onDelete={async (id) => {
            await onDeleteLead(id);
            setActive(null);
          }}
          onRestore={async () => {
            await onRestoreLeads([activeLead.id]);
            setActive(null);
          }}
          onCreateCompany={onCreateCompany}
          onUploadResume={onUploadResume}
          onCreateCoverText={onCreateCoverText}
          onUploadCover={onUploadCover}
        />
      )}
      {activeWishlist && (
        <WishlistDetailDrawer
          key={activeWishlist.id}
          id={activeWishlist.id}
          company={companyById[activeWishlist.companyId]}
          companies={companies}
          open
          readOnly
          onOpenChange={(open) => {
            if (!open) setActive(null);
          }}
          onPatch={onPatchWishlist}
          onDelete={async (id) => {
            await onDeleteWishlist(id);
            setActive(null);
          }}
          onRestore={async () => {
            await onRestoreWishlists([activeWishlist.id]);
            setActive(null);
          }}
          onCreateCompany={onCreateCompany}
        />
      )}
    </div>
  );
}

export function AddModal({
  open,
  onOpenChange,
  companies,
  resumes,
  coverLetters,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetterListItem[];
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
  onSave: (data: ApplicationFormValues) => Promise<void>;
}) {
  const [values, setValuesState] = useState(() => emptyFormValues());
  const [saving, setSaving] = useState(false);
  const canSave = Boolean(values.companyId && values.role.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>New application</DialogTitle>
          <DialogDescription>Pick existing library items or create them inline.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ApplicationFields
            key={open ? "open" : "closed"}
            companies={companies}
            resumes={resumes}
            coverLetters={coverLetters}
            values={values}
            setValues={(patch) => setValuesState((current) => ({ ...current, ...patch }))}
            onCreateCompany={onCreateCompany}
            onUploadResume={onUploadResume}
            onCreateCoverText={onCreateCoverText}
            onUploadCover={onUploadCover}
          />
        </div>
        <DialogFooter className="m-0 shrink-0 rounded-none border-t sm:justify-between">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Company and optional resume or cover letter stay in your library.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setValuesState(emptyFormValues());
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!canSave || saving}
              onClick={() => {
                setSaving(true);
                void onSave(values)
                  .then(() => {
                    onOpenChange(false);
                    setValuesState(emptyFormValues());
                  })
                  .finally(() => setSaving(false));
              }}
            >
              Save application
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
