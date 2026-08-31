"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Archive,
  ArrowDownUp,
  BriefcaseBusiness,
  Building2,
  CircleHelp,
  Command,
  Download,
  FileText,
  Filter,
  FolderOpen,
  Inbox,
  ListFilter,
  LogOut,
  Mail,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "nlite/navigation";
import {
  ApplicationFields,
  CompanyMark,
  NativeSelectField,
  PriorityBadge,
  StageBadge,
} from "@/components/workspace-fields";
import { LeadsView } from "@/components/leads-workspace";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command as CommandPalette,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Kbd } from "@/components/ui/kbd";
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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { signOut } from "@/lib/auth-client";
import {
  emptyFormValues,
  formatCompensation,
  formatDisplayDate,
  formValuesToApplicationPatch,
  formValuesToLeadPatch,
  isPriority,
  isReplyStatus,
  isSortKey,
  isStage,
  nextStepSummary,
  priorities,
  replyStatuses,
  screenTitles,
  screenFromPathname,
  screenPath,
  sortLabels,
  sources,
  stages,
  userInitials,
  valuesFromApplication,
  workModes,
  type Application,
  type ApplicationFormValues,
  type Company,
  type CoverLetter,
  type Lead,
  type Priority,
  type ReplyStatus,
  type Resume,
  type SavedView,
  type Screen,
  type SortKey,
  type Source,
  type Stage,
  type WorkMode,
  type WorkspaceUser,
} from "@/lib/domain";
import {
  bulkApplicationsRequest,
  bulkLeadsRequest,
  createApplicationRequest,
  createCompanyRequest,
  createCoverTextRequest,
  createLeadRequest,
  createViewRequest,
  deleteApplicationRequest,
  deleteCompanyRequest,
  deleteCoverRequest,
  deleteLeadRequest,
  deleteResumeRequest,
  deleteViewRequest,
  fetchWorkspace,
  patchApplicationRequest,
  patchCompanyRequest,
  patchCoverRequest,
  patchLeadRequest,
  patchResumeRequest,
  uploadCoverRequest,
  uploadResumeRequest,
} from "@/lib/workspace-api";
import { cn } from "@/lib/utils";

type Density = "comfortable" | "compact";

function isDensity(value: string | null): value is Density {
  return value === "comfortable" || value === "compact";
}

const densityListeners = new Set<() => void>();

function readDensity(): Density {
  const stored = window.localStorage.getItem("trackr-density");
  return isDensity(stored) ? stored : "comfortable";
}

function subscribeDensity(onStoreChange: () => void) {
  densityListeners.add(onStoreChange);
  return () => {
    densityListeners.delete(onStoreChange);
  };
}

function writeDensity(value: Density) {
  window.localStorage.setItem("trackr-density", value);
  for (const listener of densityListeners) listener();
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

function computeStats(applications: Application[], companies: Company[]) {
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
  applications: Application[];
  companies: Company[];
}) {
  const stats = computeStats(applications, companies);
  return (
    <div className="mx-4 mb-1 grid grid-cols-2 overflow-hidden rounded-xl border border-foreground/12 bg-background md:mx-7 md:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            "px-4 py-4 md:px-5",
            i % 2 === 0 && "border-r border-foreground/10",
            i < 2 && "border-b border-foreground/10 md:border-b-0",
            i < 3 && "md:border-r md:border-foreground/10",
          )}
        >
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{stat.value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{stat.hint}</p>
        </div>
      ))}
    </div>
  );
}

function AppSidebar({
  screen,
  applicationCount,
  leadCount,
  user,
}: {
  screen: Screen;
  applicationCount: number;
  leadCount: number;
  user: WorkspaceUser;
}) {
  const router = useRouter();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
                <Target className="size-4" />
              </div>
              <span className="font-semibold tracking-tight">Trackr</span>
              <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                PRO
              </Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={screen === "applications"}
                  onClick={() => router.push(screenPath("applications"))}
                >
                  <Inbox />
                  Applications
                  <SidebarMenuBadge>{applicationCount}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={screen === "leads"}
                  onClick={() => router.push(screenPath("leads"))}
                >
                  <Mail />
                  Leads
                  <SidebarMenuBadge>{leadCount}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(
                [
                  ["companies", Building2, "Companies"],
                  ["resumes", FileText, "Resumes"],
                  ["cover-letters", FolderOpen, "Cover letters"],
                  ["archive", Archive, "Archive"],
                ] as const
              ).map(([id, Icon, label]) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    isActive={screen === id}
                    onClick={() => router.push(screenPath(id))}
                  >
                    <Icon />
                    {label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => router.push("/settings")}>
              <Settings2 />
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => router.push("/help")}>
              <CircleHelp />
              Help center
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent">
            <Avatar size="sm">
              <AvatarFallback>{userInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.title || user.email}</p>
            </div>
            <MoreHorizontal className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="px-1.5 py-1.5 text-xs font-medium text-muted-foreground">
              {user.email}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings2 />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/help")}>
              <CircleHelp />
              Help center
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                void signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push("/sign-in");
                    },
                  },
                });
              }}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function Header({ screen, onSearch }: { screen: Screen; onSearch: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
        <span>Workspace</span>
        <span>/</span>
        <span className="text-foreground">{screenTitles[screen]}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" className="hidden md:inline-flex" onClick={onSearch}>
          <Command />
          Quick search
          <Kbd>⌘K</Kbd>
        </Button>
      </div>
    </header>
  );
}

function DetailDrawer({
  item,
  company,
  companies,
  resumes,
  coverLetters,
  open,
  onOpenChange,
  onPatch,
  onDelete,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
}: {
  item: Application;
  company: Company | undefined;
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (id: string, patch: Partial<Application>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
}) {
  const [draft, setDraft] = useState(() => valuesFromApplication(item));
  const [savedFlash, setSavedFlash] = useState(false);

  function setValues(patch: Partial<ApplicationFormValues>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function flashSaved() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }

  function patchImmediate(patch: Partial<Application>) {
    void onPatch(item.id, patch).then(flashSaved);
  }

  function saveAll() {
    const patch = formValuesToApplicationPatch(draft);
    if (!patch) return;
    void onPatch(item.id, patch).then(flashSaved);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b">
          <SheetTitle className="flex items-center gap-2">
            Application details
            {savedFlash && <span className="text-xs font-normal text-muted-foreground">Saved</span>}
          </SheetTitle>
          <SheetDescription>
            {company?.name ?? "Unknown"} · {item.role}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
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
                  "companyId",
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
        <SheetFooter className="shrink-0 border-t">
          <p className="mr-auto text-xs text-muted-foreground">
            Applied {formatDisplayDate(item.appliedDate)}
            {formatCompensation(item) !== "—" && ` · ${formatCompensation(item)}`}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm("Delete this application?")) void onDelete(item.id);
            }}
          >
            Delete
          </Button>
          <Button onClick={saveAll}>Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ApplicationsView({
  applications,
  companies,
  resumes,
  coverLetters,
  savedViews,
  year,
  setYear,
  density,
  setDensity,
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
  applications: Application[];
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  savedViews: SavedView[];
  year: string;
  setYear: (year: string) => void;
  density: Density;
  setDensity: (density: Density) => void;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewName, setViewName] = useState("");
  const [savingView, setSavingView] = useState(false);

  useEffect(() => {
    if (!focusId) return;
    setActiveId(focusId);
    onFocusConsumed?.();
  }, [focusId, onFocusConsumed]);

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

  const active = applications.find((a) => a.id === activeId) ?? null;
  const currentYear = new Date().getFullYear().toString();

  function toggleFilter<T extends string>(list: T[], value: T, setList: (next: T[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return (
    <>
      <div className="flex items-end justify-between px-4 pb-5 pt-7 md:px-7">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BriefcaseBusiness className="size-3.5" />
            Job search /
            <Select
              value={year}
              onValueChange={(value) => {
                if (value) setYear(value);
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-6 w-auto border-none bg-transparent px-1 shadow-none"
              >
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
          </p>
          <h1 className="md:text-xl">Applications</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your command center for every opportunity.
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
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={onAdd}>
            <Plus /> New entry
          </Button>
        </div>
      </div>
      <StatStrip applications={applications} companies={companies} />
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 md:px-6">
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
                  Clear extra filters
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="ml-auto hidden text-muted-foreground md:inline-flex"
              />
            }
          >
            <ListFilter />
            Saved views
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {savedViews.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No saved views yet.</p>
            )}
            {savedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => {
                  setQuery(view.query);
                  setFilter(view.stage);
                  setSort(view.sort);
                  setSelectedPriorities(view.priorities);
                  setSelectedReplies(view.replyStatuses);
                  setSelectedModes(view.workModes);
                  setSelectedSources(view.sources);
                  setYear(view.year);
                  onApplyView(view);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{view.name}</span>
                <button
                  type="button"
                  aria-label={`Delete ${view.name}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteView(view.id);
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {savingView ? (
              <div className="flex gap-1 p-1">
                <Input
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="View name"
                  className="h-7"
                />
                <Button
                  size="xs"
                  disabled={!viewName.trim()}
                  onClick={() => {
                    void onSaveView({
                      name: viewName.trim(),
                      query,
                      stage: filter,
                      sort,
                      priorities: selectedPriorities,
                      replyStatuses: selectedReplies,
                      workModes: selectedModes,
                      sources: selectedSources,
                      year,
                    }).then(() => {
                      setViewName("");
                      setSavingView(false);
                    });
                  }}
                >
                  Save
                </Button>
              </div>
            ) : (
              <DropdownMenuItem onClick={() => setSavingView(true)}>
                <Plus />
                Save current view
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {selected.length > 0 && (
          <div className="flex items-center gap-1">
            <Button variant="secondary" onClick={() => void onBulk(selected, "archive")}>
              Archive {selected.length}
            </Button>
            <Button variant="outline" onClick={() => void onBulk(selected, "delete")}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setSelected([])}>
              {selected.length} selected <X />
            </Button>
          </div>
        )}
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
          {filtered.map((item) => {
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
                        checked ? [...selected, item.id] : selected.filter((id) => id !== item.id),
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
          }}
          onCreateCompany={onCreateCompany}
          onUploadResume={onUploadResume}
          onCreateCoverText={onCreateCoverText}
          onUploadCover={onUploadCover}
        />
      )}
    </>
  );
}

function CompaniesView({
  companies,
  focusId = null,
  onFocusConsumed,
  onCreate,
  onPatch,
  onDelete,
}: {
  companies: Company[];
  focusId?: string | null;
  onFocusConsumed?: () => void;
  onCreate: (name: string, extra?: { website?: string }) => Promise<string>;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const active = companies.find((c) => c.id === activeId) ?? null;
  const [draft, setDraft] = useState({ name: "", website: "", location: "", logo: "" });

  useEffect(() => {
    if (!focusId) return;
    const company = companies.find((c) => c.id === focusId);
    if (!company) {
      onFocusConsumed?.();
      return;
    }
    setActiveId(company.id);
    setDraft({
      name: company.name,
      website: company.website,
      location: company.location,
      logo: company.logo,
    });
    onFocusConsumed?.();
  }, [focusId, companies, onFocusConsumed]);

  function resetCreate() {
    setNewName("");
    setNewWebsite("");
    setCreating(false);
  }

  return (
    <div className="px-4 pb-8 pt-7 md:px-7">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="md:text-xl">Companies</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reuse companies across applications and leads without retyping.
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
          <PopoverTrigger render={<Button variant="outline" />}>
            <Plus /> Add company
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 gap-3 p-3">
            <PopoverHeader>
              <PopoverTitle>Add company</PopoverTitle>
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
                  Add
                </Button>
              </div>
            </FieldGroup>
          </PopoverContent>
        </Popover>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Website</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => {
                setActiveId(c.id);
                setDraft({
                  name: c.name,
                  website: c.website,
                  location: c.location,
                  logo: c.logo,
                });
              }}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <CompanyMark logo={c.logo} color={c.color} />
                  <span className="font-medium">{c.name}</span>
                </div>
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
          ))}
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
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-md">
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
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel>Logo letter</FieldLabel>
                <Input
                  value={draft.logo}
                  onChange={(e) => setDraft({ ...draft, logo: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel>Location</FieldLabel>
                <Input
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel>Website</FieldLabel>
                <Input
                  type="url"
                  value={draft.website}
                  onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                />
              </Field>
            </div>
          )}
          <SheetFooter className="border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (active && window.confirm("Delete this company?")) void onDelete(active.id);
              }}
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                if (!active) return;
                void onPatch(active.id, draft).then(() => setActiveId(null));
              }}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ResumesView({
  resumes,
  applications,
  companies,
  onUpload,
  onRename,
  onDelete,
}: {
  resumes: Resume[];
  applications: Application[];
  companies: Company[];
  onUpload: (file: File) => Promise<string>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const active = resumes.find((r) => r.id === activeId) ?? null;
  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );
  const usedBy = active ? applications.filter((a) => a.resumeId === active.id) : [];

  return (
    <div className="px-4 pb-8 pt-7 md:px-7">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="md:text-xl">Resumes</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Open any resume to see the file and where it is used.
          </p>
        </div>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
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
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-xl">
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
            <Button
              variant="outline"
              onClick={() => {
                if (active && window.confirm("Delete this resume?")) void onDelete(active.id);
              }}
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                if (active) void onRename(active.id, name);
              }}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CoverLettersView({
  coverLetters,
  applications,
  companies,
  onCreateText,
  onUpload,
  onPatch,
  onDelete,
}: {
  coverLetters: CoverLetter[];
  applications: Application[];
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
  const active = coverLetters.find((c) => c.id === activeId) ?? null;
  const [editName, setEditName] = useState("");
  const [editBody, setEditBody] = useState("");
  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );
  const usedBy = active ? applications.filter((a) => a.coverLetterId === active.id) : [];

  return (
    <div className="px-4 pb-8 pt-7 md:px-7">
      <div className="mb-6 flex items-end justify-between gap-2">
        <div>
          <h1 className="md:text-xl">Cover letters</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Open any letter to read the full text or file details.
          </p>
        </div>
        <div className="flex gap-2">
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
            <PopoverTrigger render={<Button variant="outline" />}>
              <Pencil /> Write
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
                    Save
                  </Button>
                </div>
              </FieldGroup>
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload /> Upload
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
                setEditBody(c.kind === "text" ? c.body : "");
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
                  {c.kind === "file" ? c.fileName : c.body}
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
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-xl">
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
            <Button
              variant="outline"
              onClick={() => {
                if (active && window.confirm("Delete this cover letter?")) void onDelete(active.id);
              }}
            >
              <Trash2 />
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
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ArchiveView({
  applications,
  companies,
  resumes,
  coverLetters,
  focusId = null,
  onFocusConsumed,
  onPatch,
  onDelete,
  onCreateCompany,
  onUploadResume,
  onCreateCoverText,
  onUploadCover,
  onRestore,
}: {
  applications: Application[];
  companies: Company[];
  resumes: Resume[];
  coverLetters: CoverLetter[];
  focusId?: string | null;
  onFocusConsumed?: () => void;
  onPatch: (id: string, patch: Partial<Application>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateCompany: (name: string) => Promise<string>;
  onUploadResume: (file: File) => Promise<string>;
  onCreateCoverText: (name: string, body: string) => Promise<string>;
  onUploadCover: (file: File) => Promise<string>;
  onRestore: (ids: string[]) => Promise<void>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );
  const active = applications.find((a) => a.id === activeId) ?? null;

  useEffect(() => {
    if (!focusId) return;
    setActiveId(focusId);
    onFocusConsumed?.();
  }, [focusId, onFocusConsumed]);

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-24 text-center">
        <Archive className="size-8 text-muted-foreground" />
        <h1>Archive</h1>
        <p className="text-sm text-muted-foreground">
          Closed and withdrawn applications land here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-7 md:px-7">
      <div className="mb-6">
        <h1 className="md:text-xl">Archive</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Closed and withdrawn applications land here.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {applications.map((item) => {
          const company = companyById[item.companyId];
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => setActiveId(item.id)}
              >
                {company && <CompanyMark logo={company.logo} color={company.color} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{company?.name ?? "Unknown"}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                </div>
                <StageBadge stage={item.stage} />
              </button>
              <Button variant="outline" onClick={() => void onRestore([item.id])}>
                Restore
              </Button>
            </div>
          );
        })}
      </div>
      {active && (
        <DetailDrawer
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
          }}
          onCreateCompany={onCreateCompany}
          onUploadResume={onUploadResume}
          onCreateCoverText={onCreateCoverText}
          onUploadCover={onUploadCover}
        />
      )}
    </div>
  );
}

function AddModal({
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
  onSave: (data: ApplicationFormValues) => Promise<void>;
}) {
  const [values, setValuesState] = useState(() => emptyFormValues(resumes));
  const [saving, setSaving] = useState(false);
  const canSave = Boolean(values.companyId && values.role.trim() && values.resumeId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setValuesState(emptyFormValues(resumes));
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>Add application</DialogTitle>
          <DialogDescription>Pick existing library items or create them inline.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ApplicationFields
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
            Company, resume, and cover letter stay in your library.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSave || saving}
              onClick={() => {
                setSaving(true);
                void onSave(values)
                  .then(() => onOpenChange(false))
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

export default function JobHuntWorkspace({ user: initialUser }: { user: WorkspaceUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const screen = screenFromPathname(pathname);
  const [modal, setModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState<
    | { kind: "application"; id: string }
    | { kind: "company"; id: string }
    | { kind: "lead"; id: string }
    | null
  >(null);
  const [user, setUser] = useState(initialUser);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [year, setYear] = useState("all");
  const density = useSyncExternalStore(subscribeDensity, readDensity, (): Density => "comfortable");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchWorkspace()
      .then((payload) => {
        setUser(payload.user);
        setCompanies(payload.companies);
        setResumes(payload.resumes);
        setCoverLetters(payload.coverLetters);
        setApplications(payload.applications);
        setLeads(payload.leads);
        setSavedViews(payload.savedViews);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not load workspace");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function fail(cause: unknown) {
    setError(cause instanceof Error ? cause.message : "Something went wrong");
  }

  async function createCompany(name: string, extra?: { website?: string; location?: string }) {
    const company = await createCompanyRequest(name, extra);
    setCompanies((prev) => [company, ...prev]);
    return company.id;
  }

  async function uploadResume(file: File) {
    const resume = await uploadResumeRequest(file);
    setResumes((prev) => [resume, ...prev]);
    return resume.id;
  }

  async function createCoverText(name: string, body: string) {
    const letter = await createCoverTextRequest(name, body);
    setCoverLetters((prev) => [letter, ...prev]);
    return letter.id;
  }

  async function uploadCover(file: File) {
    const letter = await uploadCoverRequest(file);
    setCoverLetters((prev) => [letter, ...prev]);
    return letter.id;
  }

  async function patchApplication(id: string, patch: Partial<Application>) {
    const updated = await patchApplicationRequest(id, patch);
    setApplications((prev) => prev.map((item) => (item.id === id ? updated : item)));
  }

  async function patchLead(id: string, patch: Partial<Lead>) {
    const updated = await patchLeadRequest(id, patch);
    setLeads((prev) => prev.map((item) => (item.id === id ? updated : item)));
  }

  const activeApplications = applications.filter((item) => !item.archived);
  const archivedApplications = applications.filter((item) => item.archived);
  const activeLeads = leads.filter((item) => !item.archived);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar
        screen={screen}
        applicationCount={activeApplications.length}
        leadCount={activeLeads.length}
        user={user}
      />
      <SidebarInset className="min-h-0 overflow-hidden">
        <Header screen={screen} onSearch={() => setSearchOpen(true)} />
        {error && (
          <div className="flex items-center justify-between border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <span>{error}</span>
            <Button size="xs" variant="ghost" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-7 py-12 text-sm text-muted-foreground">Loading workspace…</p>
          ) : (
            <>
              {screen === "applications" && (
                <ApplicationsView
                  applications={activeApplications}
                  companies={companies}
                  resumes={resumes}
                  coverLetters={coverLetters}
                  savedViews={savedViews}
                  year={year}
                  setYear={setYear}
                  density={density}
                  setDensity={writeDensity}
                  focusId={searchFocus?.kind === "application" ? searchFocus.id : null}
                  onFocusConsumed={() => setSearchFocus(null)}
                  onAdd={() => setModal(true)}
                  onPatch={async (id, patch) => {
                    try {
                      await patchApplication(id, patch);
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onDelete={async (id) => {
                    try {
                      await deleteApplicationRequest(id);
                      setApplications((prev) => prev.filter((item) => item.id !== id));
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onBulk={async (ids, action) => {
                    try {
                      await bulkApplicationsRequest(ids, action);
                      if (action === "delete") {
                        setApplications((prev) => prev.filter((item) => !ids.includes(item.id)));
                      } else {
                        setApplications((prev) =>
                          prev.map((item) =>
                            ids.includes(item.id) ? { ...item, archived: true } : item,
                          ),
                        );
                      }
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onCreateCompany={async (name) => {
                    try {
                      return await createCompany(name);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onUploadResume={async (file) => {
                    try {
                      return await uploadResume(file);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onCreateCoverText={async (name, body) => {
                    try {
                      return await createCoverText(name, body);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onUploadCover={async (file) => {
                    try {
                      return await uploadCover(file);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onSaveView={async (view) => {
                    try {
                      const saved = await createViewRequest(view);
                      setSavedViews((prev) => [saved, ...prev]);
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onDeleteView={async (id) => {
                    try {
                      await deleteViewRequest(id);
                      setSavedViews((prev) => prev.filter((view) => view.id !== id));
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onApplyView={(view) => setYear(view.year)}
                />
              )}
              {screen === "leads" && (
                <LeadsView
                  leads={activeLeads}
                  companies={companies}
                  resumes={resumes}
                  coverLetters={coverLetters}
                  density={density}
                  setDensity={writeDensity}
                  focusId={searchFocus?.kind === "lead" ? searchFocus.id : null}
                  onFocusConsumed={() => setSearchFocus(null)}
                  onPatch={async (id, patch) => {
                    try {
                      await patchLead(id, patch);
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onDelete={async (id) => {
                    try {
                      await deleteLeadRequest(id);
                      setLeads((prev) => prev.filter((item) => item.id !== id));
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onBulk={async (ids, action) => {
                    try {
                      await bulkLeadsRequest(ids, action);
                      if (action === "delete") {
                        setLeads((prev) => prev.filter((item) => !ids.includes(item.id)));
                      } else {
                        setLeads((prev) =>
                          prev.map((item) =>
                            ids.includes(item.id) ? { ...item, archived: true } : item,
                          ),
                        );
                      }
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onCreateCompany={async (name) => {
                    try {
                      return await createCompany(name);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onUploadResume={async (file) => {
                    try {
                      return await uploadResume(file);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onCreateCoverText={async (name, body) => {
                    try {
                      return await createCoverText(name, body);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onUploadCover={async (file) => {
                    try {
                      return await uploadCover(file);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onCreate={async (data) => {
                    const patch = formValuesToLeadPatch(data);
                    if (!patch) return;
                    try {
                      const created = await createLeadRequest(patch);
                      setLeads((prev) => [created, ...prev]);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                />
              )}
              {screen === "companies" && (
                <CompaniesView
                  companies={companies}
                  focusId={searchFocus?.kind === "company" ? searchFocus.id : null}
                  onFocusConsumed={() => setSearchFocus(null)}
                  onCreate={async (name, extra) => {
                    try {
                      return await createCompany(name, extra);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onPatch={async (id, patch) => {
                    try {
                      const company = await patchCompanyRequest(id, patch);
                      setCompanies((prev) => prev.map((item) => (item.id === id ? company : item)));
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onDelete={async (id) => {
                    try {
                      await deleteCompanyRequest(id);
                      setCompanies((prev) => prev.filter((item) => item.id !== id));
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                />
              )}
              {screen === "resumes" && (
                <ResumesView
                  resumes={resumes}
                  applications={applications}
                  companies={companies}
                  onUpload={async (file) => {
                    try {
                      return await uploadResume(file);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onRename={async (id, name) => {
                    try {
                      const resume = await patchResumeRequest(id, { name });
                      setResumes((prev) => prev.map((item) => (item.id === id ? resume : item)));
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onDelete={async (id) => {
                    try {
                      await deleteResumeRequest(id);
                      setResumes((prev) => prev.filter((item) => item.id !== id));
                      setLeads((prev) =>
                        prev.map((item) =>
                          item.resumeId === id ? { ...item, resumeId: null } : item,
                        ),
                      );
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                />
              )}
              {screen === "cover-letters" && (
                <CoverLettersView
                  coverLetters={coverLetters}
                  applications={applications}
                  companies={companies}
                  onCreateText={async (name, body) => {
                    try {
                      return await createCoverText(name, body);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onUpload={async (file) => {
                    try {
                      return await uploadCover(file);
                    } catch (cause) {
                      fail(cause);
                      throw cause;
                    }
                  }}
                  onPatch={async (id, patch) => {
                    try {
                      const letter = await patchCoverRequest(id, patch);
                      setCoverLetters((prev) =>
                        prev.map((item) => (item.id === id ? letter : item)),
                      );
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onDelete={async (id) => {
                    try {
                      await deleteCoverRequest(id);
                      setCoverLetters((prev) => prev.filter((item) => item.id !== id));
                      setApplications((prev) =>
                        prev.map((item) =>
                          item.coverLetterId === id ? { ...item, coverLetterId: null } : item,
                        ),
                      );
                      setLeads((prev) =>
                        prev.map((item) =>
                          item.coverLetterId === id ? { ...item, coverLetterId: null } : item,
                        ),
                      );
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                />
              )}
              {screen === "archive" && (
                <ArchiveView
                  applications={archivedApplications}
                  companies={companies}
                  resumes={resumes}
                  coverLetters={coverLetters}
                  focusId={searchFocus?.kind === "application" ? searchFocus.id : null}
                  onFocusConsumed={() => setSearchFocus(null)}
                  onPatch={async (id, patch) => {
                    try {
                      await patchApplication(id, patch);
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onDelete={async (id) => {
                    try {
                      await deleteApplicationRequest(id);
                      setApplications((prev) => prev.filter((item) => item.id !== id));
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                  onCreateCompany={createCompany}
                  onUploadResume={uploadResume}
                  onCreateCoverText={createCoverText}
                  onUploadCover={uploadCover}
                  onRestore={async (ids) => {
                    try {
                      await bulkApplicationsRequest(ids, "unarchive");
                      setApplications((prev) =>
                        prev.map((item) =>
                          ids.includes(item.id) ? { ...item, archived: false } : item,
                        ),
                      );
                    } catch (cause) {
                      fail(cause);
                    }
                  }}
                />
              )}
            </>
          )}
        </div>
      </SidebarInset>
      <AddModal
        open={modal}
        onOpenChange={setModal}
        companies={companies}
        resumes={resumes}
        coverLetters={coverLetters}
        onCreateCompany={createCompany}
        onUploadResume={uploadResume}
        onCreateCoverText={createCoverText}
        onUploadCover={uploadCover}
        onSave={async (data) => {
          const patch = formValuesToApplicationPatch(data);
          if (!patch) return;
          try {
            const created = await createApplicationRequest(patch);
            setApplications((prev) => [created, ...prev]);
          } catch (cause) {
            fail(cause);
            throw cause;
          }
        }}
      />
      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Quick search"
        className="sm:max-w-xl"
      >
        <CommandPalette className="min-h-80">
          <CommandInput placeholder="Search applications, leads, companies, resumes..." />
          <CommandList className="max-h-96">
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Go to">
              {(
                [
                  ["applications", "Applications"],
                  ["leads", "Leads"],
                  ["companies", "Companies"],
                  ["resumes", "Resumes"],
                  ["cover-letters", "Cover letters"],
                  ["archive", "Archive"],
                ] as const
              ).map(([id, label]) => (
                <CommandItem
                  key={id}
                  onSelect={() => {
                    router.push(screenPath(id));
                    setSearchOpen(false);
                  }}
                >
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Applications">
              {applications.slice(0, 12).map((item) => {
                const company = companies.find((c) => c.id === item.companyId);
                return (
                  <CommandItem
                    key={item.id}
                    value={`${company?.name ?? ""} ${item.role}`}
                    onSelect={() => {
                      setSearchFocus({ kind: "application", id: item.id });
                      router.push(screenPath(item.archived ? "archive" : "applications"));
                      setSearchOpen(false);
                    }}
                  >
                    {company?.name ?? "Unknown"} · {item.role}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading="Leads">
              {leads.slice(0, 12).map((item) => {
                const company = companies.find((c) => c.id === item.companyId);
                return (
                  <CommandItem
                    key={item.id}
                    value={`${company?.name ?? ""} ${item.personName} ${item.platform}`}
                    onSelect={() => {
                      setSearchFocus({ kind: "lead", id: item.id });
                      router.push(screenPath("leads"));
                      setSearchOpen(false);
                    }}
                  >
                    {company?.name ?? "Unknown"} · {item.personName}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandGroup heading="Companies">
              {companies.slice(0, 8).map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => {
                    setSearchFocus({ kind: "company", id: company.id });
                    router.push(screenPath("companies"));
                    setSearchOpen(false);
                  }}
                >
                  {company.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandPalette>
      </CommandDialog>
    </SidebarProvider>
  );
}
