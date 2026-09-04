"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Filter, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import {
  CompanyGroupHeaderRow,
  GroupedItemIndent,
  useCollapsedCompanyGroups,
} from "@/components/company-group-rows";
import {
  CompanyMark,
  LeadFields,
  LeadStatusBadge,
  PriorityBadge,
} from "@/components/workspace-fields";
import { SavedViewsMenu } from "@/components/saved-views-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  emptyLeadFormValues,
  formatDisplayDate,
  formValuesToLeadPatch,
  isLeadPlatform,
  isLeadSortKey,
  isLeadStatus,
  leadPlatforms,
  leadSortLabels,
  leadStatuses,
  nextStepSummary,
  priorities,
  valuesFromLead,
  type Company,
  type CoverLetter,
  type Lead,
  type LeadFormValues,
  type LeadPlatform,
  type LeadSortKey,
  type LeadStatus,
  type Priority,
  type Resume,
  type SavedView,
} from "@/lib/domain";
import { groupByCompany } from "@/lib/group-by-company";

type Density = "comfortable" | "compact";

function isDensity(value: string): value is Density {
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

function computeLeadStats(leads: Lead[], companies: Company[]) {
  const active = leads.filter((item) => !item.archived);
  const inProgress = active.filter(
    (item) =>
      item.status === "Replied" || item.status === "Follow-up" || item.status === "Meeting booked",
  );
  const sent = active.filter((item) => item.status !== "Draft");
  const replied = sent.filter(
    (item) =>
      item.status === "Replied" ||
      item.status === "Follow-up" ||
      item.status === "Meeting booked" ||
      item.status === "Converted",
  );
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = active
    .filter((item) => item.nextStepDate && item.nextStepDate >= today)
    .sort((a, b) => a.nextStepDate.localeCompare(b.nextStepDate))[0];
  const company = upcoming ? companies.find((c) => c.id === upcoming.companyId) : undefined;
  const rate = sent.length === 0 ? 0 : Math.round((replied.length / sent.length) * 100);
  return [
    {
      label: "Active leads",
      value: String(active.length),
      hint: `${leads.length} total including archive`,
    },
    {
      label: "In progress",
      value: String(inProgress.length),
      hint: active.length
        ? `${Math.round((inProgress.length / active.length) * 100)}% of active`
        : "No active leads",
    },
    {
      label: "Response rate",
      value: sent.length ? `${rate}%` : "—",
      hint: `${replied.length} replied of ${sent.length} sent`,
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

function LeadStatStrip({ leads, companies }: { leads: Lead[]; companies: Company[] }) {
  const stats = computeLeadStats(leads, companies);
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

export function LeadDetailDrawer({
  item,
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
  item: Lead;
  company: Company | undefined;
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (id: string, patch: Partial<Lead>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore?: () => Promise<void>;
  readOnly?: boolean;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
}) {
  const [draft, setDraft] = useState(() => valuesFromLead(item));
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function setValues(patch: Partial<LeadFormValues>) {
    if (readOnly) return;
    setDraft((current) => ({ ...current, ...patch }));
  }

  function flashSaved() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }

  function patchImmediate(patch: Partial<Lead>) {
    if (readOnly) return;
    void onPatch(item.id, patch).then(flashSaved);
  }

  function saveAll() {
    if (readOnly) return;
    const patch = formValuesToLeadPatch(draft);
    if (!patch) return;
    void onPatch(item.id, patch).then(flashSaved);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
          initialFocus={false}
        >
          <SheetHeader className="shrink-0 border-b">
            <SheetTitle className="flex items-center gap-2">
              Lead details
              {savedFlash && (
                <span className="text-xs font-normal text-muted-foreground">Saved</span>
              )}
            </SheetTitle>
            <SheetDescription>
              {company?.name ?? "Unknown"} · {item.personName}
              {readOnly ? " · Archived" : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div {...(readOnly ? { inert: true } : {})}>
              <div className="flex items-start gap-3 px-4 pt-4">
                {company && <CompanyMark logo={company.logo} color={company.color} large />}
                <div className="min-w-0">
                  <p className="font-semibold">{company?.name ?? "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{draft.personName}</p>
                </div>
              </div>
              <div className="p-4 pt-4">
                <LeadFields
                  companies={companies}
                  resumes={resumes}
                  coverLetters={coverLetters}
                  values={draft}
                  setValues={(patch) => {
                    setValues(patch);
                    const immediateKeys = [
                      "status",
                      "priority",
                      "platform",
                      "resumeId",
                      "coverLetterId",
                      "reminderTime",
                    ] as const;
                    const immediate: Partial<Lead> = {};
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
              Sent {formatDisplayDate(item.sentDate)} · {item.platform}
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
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this lead?"
        description="This permanently removes the lead. This cannot be undone."
        onConfirm={() => onDelete(item.id)}
      />
    </>
  );
}

function AddLeadModal({
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
  coverLetters: CoverLetter[];
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
  onSave: (data: LeadFormValues) => Promise<void>;
}) {
  const [values, setValuesState] = useState(emptyLeadFormValues);
  const [saving, setSaving] = useState(false);
  const canSave = Boolean(values.companyId && values.personName.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Track outreach across Twitter, LinkedIn, cold email, and more.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <LeadFields
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
                setValuesState(emptyLeadFormValues());
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
                    setValuesState(emptyLeadFormValues());
                  })
                  .finally(() => setSaving(false));
              }}
            >
              Save lead
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeadsView({
  leads,
  companies,
  resumes,
  coverLetters,
  density,
  setDensity,
  groupByCompany: groupByCompanyEnabled,
  setGroupByCompany,
  focusId = null,
  onFocusConsumed,
  onPatch,
  onDelete,
  onBulk,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
  onCreate,
  savedViews,
  onSaveView,
  onDeleteView,
}: {
  leads: Lead[];
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  density: Density;
  setDensity: (density: Density) => void;
  groupByCompany: boolean;
  setGroupByCompany: (value: boolean) => void;
  focusId?: string | null;
  onFocusConsumed?: () => void;
  onPatch: (id: string, patch: Partial<Lead>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulk: (ids: string[], action: "archive" | "delete") => Promise<void>;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
  onCreate: (data: LeadFormValues) => Promise<void>;
  savedViews: SavedView[];
  onSaveView: (view: Omit<SavedView, "id">) => Promise<void>;
  onDeleteView: (id: string) => Promise<void>;
}) {
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | LeadStatus>("All");
  const [sort, setSort] = useState<LeadSortKey>("recent");
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<LeadPlatform[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const { isCollapsed, toggle } = useCollapsedCompanyGroups();
  const activeId = focusId ?? localActiveId;

  function setActiveId(id: string | null) {
    if (focusId) onFocusConsumed?.();
    setLocalActiveId(id);
  }

  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );

  const extraFilterCount = selectedPriorities.length + selectedPlatforms.length;

  const filtered = useMemo(() => {
    const rows = leads.filter((lead) => {
      const company = companyById[lead.companyId];
      const hay =
        `${company?.name ?? ""} ${lead.personName} ${lead.personRole} ${lead.platform} ${lead.tags.join(" ")}`.toLowerCase();
      if (filter !== "All" && lead.status !== filter) return false;
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(lead.priority))
        return false;
      if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(lead.platform)) return false;
      return hay.includes(query.toLowerCase());
    });
    const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
    const statusRank = Object.fromEntries(leadStatuses.map((status, index) => [status, index]));
    rows.sort((a, b) => {
      if (sort === "company") {
        return (companyById[a.companyId]?.name ?? "").localeCompare(
          companyById[b.companyId]?.name ?? "",
        );
      }
      if (sort === "status") return (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0);
      if (sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
      return b.sentDate.localeCompare(a.sentDate) || b.createdAt.localeCompare(a.createdAt);
    });
    return rows;
  }, [companyById, filter, leads, query, selectedPlatforms, selectedPriorities, sort]);

  const companyGroups = useMemo(
    () => (groupByCompanyEnabled ? groupByCompany(filtered, companyById) : []),
    [companyById, filtered, groupByCompanyEnabled],
  );

  const active = leads.find((lead) => lead.id === activeId) ?? null;

  function toggleFilter<T extends string>(list: T[], value: T, setList: (next: T[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return (
    <>
      <div className="track-page-header">
        <div>
          <h1>Who you reached out to</h1>
          <p className="track-page-lede">
            DMs, cold emails, and outreach threads with a clear next step.
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
          <Button onClick={() => setModal(true)}>
            <Plus /> New lead
          </Button>
        </div>
      </div>
      <LeadStatStrip leads={leads} companies={companies} />
      <div className="track-toolbar">
        <div className="relative min-w-[180px] flex-1 md:max-w-xs">
          <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads..."
            className="pl-8"
            aria-label="Search leads"
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
                <p className="mb-1 text-xs text-muted-foreground">Platform</p>
                <div className="flex flex-wrap gap-1">
                  {leadPlatforms.map((platform) => (
                    <Button
                      key={platform}
                      size="xs"
                      variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                      onClick={() =>
                        toggleFilter(selectedPlatforms, platform, setSelectedPlatforms)
                      }
                    >
                      {platform}
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
                    setSelectedPlatforms([]);
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
            if (value === "All" || isLeadStatus(value)) setFilter(value);
          }}
        >
          <SelectTrigger aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            {leadStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" className="text-muted-foreground" />}
          >
            <ArrowDownUp />
            Sort: {leadSortLabels[sort]}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => {
                if (isLeadSortKey(value)) setSort(value);
              }}
            >
              {Object.entries(leadSortLabels).map(([key, label]) => (
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
            screen: "leads",
            query,
            stage: filter,
            sort,
            priorities: selectedPriorities,
            replyStatuses: [],
            workModes: [],
            sources: selectedPlatforms,
            year: "all",
          }}
          onSave={onSaveView}
          onDelete={onDeleteView}
          onApply={(view) => {
            setQuery(view.query);
            if (view.stage === "All" || isLeadStatus(view.stage)) setFilter(view.stage);
            if (isLeadSortKey(view.sort)) setSort(view.sort);
            setSelectedPriorities(view.priorities);
            setSelectedPlatforms(view.sources.filter(isLeadPlatform));
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
        <Button className="ml-auto md:hidden" onClick={() => setModal(true)}>
          <Plus /> New
        </Button>
      </div>
      <Table>
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead className="w-10 pl-4 pr-0" />
            <TableHead>Company / person</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Next step</TableHead>
            <TableHead>Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupByCompanyEnabled
            ? companyGroups.flatMap((group) => {
                const groupSelected = group.items.filter((item) => selected.includes(item.id));
                const renderRow = (item: Lead, grouped: boolean) => {
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
                          aria-label={`Select ${item.personName}`}
                        />
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => setActiveId(item.id)}>
                        {grouped ? (
                          <GroupedItemIndent>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.personName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.personRole || item.platform}
                              </p>
                            </div>
                          </GroupedItemIndent>
                        ) : (
                          <div className="flex min-w-0 items-center gap-3">
                            {company && <CompanyMark logo={company.logo} color={company.color} />}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{company?.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.personName}
                                {item.personRole ? ` · ${item.personRole}` : ""}
                              </p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className="hidden cursor-pointer text-muted-foreground md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        {item.platform}
                      </TableCell>
                      <TableCell
                        className="hidden cursor-pointer md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        <LeadStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell
                        className="hidden cursor-pointer text-muted-foreground md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        {formatDisplayDate(item.sentDate)}
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
                    label="leads"
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
                    colSpan={7}
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
                        aria-label={`Select ${item.personName}`}
                      />
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => setActiveId(item.id)}>
                      <div className="flex min-w-0 items-center gap-3">
                        {company && <CompanyMark logo={company.logo} color={company.color} />}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{company?.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.personName}
                            {item.personRole ? ` · ${item.personRole}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell
                      className="hidden cursor-pointer text-muted-foreground md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      {item.platform}
                    </TableCell>
                    <TableCell
                      className="hidden cursor-pointer md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      <LeadStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell
                      className="hidden cursor-pointer text-muted-foreground md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      {formatDisplayDate(item.sentDate)}
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
          <p className="text-sm font-medium">No leads found</p>
          <p className="text-xs text-muted-foreground">Try a different search or filter.</p>
        </div>
      )}
      {active && (
        <LeadDetailDrawer
          key={active.id}
          item={active}
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
      <AddLeadModal
        open={modal}
        onOpenChange={setModal}
        companies={companies}
        resumes={resumes}
        coverLetters={coverLetters}
        onCreateCompany={onCreateCompany}
        onUploadResume={onUploadResume}
        onCreateCoverText={onCreateCoverText}
        onUploadCover={onUploadCover}
        onSave={onCreate}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Delete ${selected.length} lead${selected.length === 1 ? "" : "s"}?`}
        description="Selected leads will be permanently removed. This cannot be undone."
        onConfirm={async () => {
          await onBulk(selected, "delete");
          setSelected([]);
        }}
      />
    </>
  );
}
