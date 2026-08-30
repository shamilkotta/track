"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowDownUp,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  FileText,
  Filter,
  FolderOpen,
  Inbox,
  Kanban,
  ListFilter,
  Mail,
  MoreHorizontal,
  Moon,
  Paperclip,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "applications" | "pipeline" | "weekly";
type Application = {
  id: number;
  company: string;
  role: string;
  stage: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  location: string;
  logo: string;
  color: string;
  contact: string;
  next: string;
  compensation: string;
  resume: string;
  tags: string[];
};

const applications: Application[] = [
  {
    id: 1,
    company: "Vercel",
    role: "Product Designer",
    stage: "Interview",
    date: "Aug 28, 2024",
    priority: "High",
    location: "Remote · US",
    logo: "▲",
    color: "bg-foreground text-background",
    contact: "Maya Chen · Talent",
    next: "Portfolio review · Tomorrow",
    compensation: "$180k – $210k + equity",
    resume: "Product Design · v4",
    tags: ["Design systems", "B2B SaaS"],
  },
  {
    id: 2,
    company: "Linear",
    role: "Senior Product Designer",
    stage: "Applied",
    date: "Aug 26, 2024",
    priority: "High",
    location: "San Francisco, CA",
    logo: "L",
    color: "bg-foreground text-background",
    contact: "No contact yet",
    next: "Follow up · Sep 3",
    compensation: "$170k – $205k + equity",
    resume: "Product Design · v4",
    tags: ["Developer tools", "Systems"],
  },
  {
    id: 3,
    company: "Notion",
    role: "Product Designer, Growth",
    stage: "Screening",
    date: "Aug 23, 2024",
    priority: "Medium",
    location: "New York · Hybrid",
    logo: "N",
    color: "bg-muted text-foreground",
    contact: "Jordan Patel · Recruiter",
    next: "Recruiter call · Sep 5",
    compensation: "$160k – $190k + equity",
    resume: "Growth Design · v2",
    tags: ["Growth", "Consumer"],
  },
  {
    id: 4,
    company: "Stripe",
    role: "Staff Product Designer",
    stage: "Offer",
    date: "Aug 15, 2024",
    priority: "High",
    location: "Remote · US",
    logo: "S",
    color: "bg-foreground text-background",
    contact: "Alex Rivera · Hiring manager",
    next: "Review offer · Sep 2",
    compensation: "$210k – $240k + equity",
    resume: "Staff Portfolio · v1",
    tags: ["Fintech", "Platform"],
  },
  {
    id: 5,
    company: "Figma",
    role: "Product Designer",
    stage: "Rejected",
    date: "Aug 12, 2024",
    priority: "Low",
    location: "San Francisco, CA",
    logo: "F",
    color: "bg-muted text-foreground",
    contact: "Taylor Kim · Talent",
    next: "Archive",
    compensation: "$175k – $200k + equity",
    resume: "Product Design · v3",
    tags: ["Collaboration", "Design tools"],
  },
  {
    id: 6,
    company: "Arc",
    role: "Senior Designer",
    stage: "Wishlist",
    date: "Aug 08, 2024",
    priority: "Medium",
    location: "Remote · US",
    logo: "A",
    color: "bg-muted text-foreground",
    contact: "No contact yet",
    next: "Tailor application · Sep 6",
    compensation: "$150k – $180k",
    resume: "Product Design · v4",
    tags: ["Future of work"],
  },
];

const stages = ["Wishlist", "Applied", "Screening", "Interview", "Offer"];

function Logo({ item, large = false }: { item: Application; large?: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg font-semibold",
        large ? "size-11 text-lg" : "size-9 text-sm",
        item.color,
      )}
    >
      {item.logo}
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "green" && "border-foreground/15 bg-foreground/10",
        tone === "amber" && "border-foreground/10 bg-muted",
        tone === "red" && "border-foreground/10 bg-muted",
        tone === "neutral" && "border-border bg-muted/60",
      )}
    >
      {children}
    </span>
  );
}

function Sidebar({ variant, setVariant }: { variant: Variant; setVariant: (v: Variant) => void }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4 lg:flex">
      <div className="flex items-center gap-2 px-2 pb-7">
        <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
          <Target className="size-4" />
        </div>
        <span className="font-semibold tracking-tight">Trackr</span>
        <span className="ml-auto rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          PRO
        </span>
      </div>
      <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Workspace
      </div>
      <nav className="flex flex-col gap-1">
        {[
          ["applications", Inbox, "Applications", "12"],
          ["pipeline", Kanban, "Pipeline", ""],
          ["weekly", CalendarDays, "Weekly plan", ""],
        ].map(([id, Icon, label, count]) => (
          <button
            key={id as string}
            onClick={() => setVariant(id as Variant)}
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent",
              variant === id && "bg-accent font-medium",
            )}
          >
            <Icon className="size-4 text-muted-foreground" />
            <span>{label as string}</span>
            {count && (
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                {count as string}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="mb-2 mt-8 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Library
      </div>
      <nav className="flex flex-col gap-1">
        <button className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-accent">
          <FileText className="size-4 text-muted-foreground" />
          Resumes
        </button>
        <button className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-accent">
          <FolderOpen className="size-4 text-muted-foreground" />
          Cover letters
        </button>
        <button className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-accent">
          <Archive className="size-4 text-muted-foreground" />
          Archive
        </button>
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
        <button className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-accent">
          <Settings2 className="size-4 text-muted-foreground" />
          Settings
        </button>
        <button className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-accent">
          <CircleHelp className="size-4 text-muted-foreground" />
          Help center
        </button>
        <div className="mt-3 flex items-center gap-2 rounded-md bg-accent/60 p-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            AS
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Alex Smith</p>
            <p className="truncate text-[11px] text-muted-foreground">Product designer</p>
          </div>
          <MoreHorizontal className="ml-auto size-4 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}

function Header({
  variant,
  dark,
  setDark,
  onAdd,
}: {
  variant: Variant;
  dark: boolean;
  setDark: (v: boolean) => void;
  onAdd: () => void;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-7">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
          <Target className="size-4" />
        </div>
        <span className="font-semibold">Trackr</span>
      </div>
      <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
        <span>Workspace</span>
        <span>/</span>
        <span className="text-foreground">
          {variant === "applications"
            ? "Applications"
            : variant === "pipeline"
              ? "Pipeline"
              : "Weekly plan"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className="hidden items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent md:flex">
          <Command className="size-3.5" />
          Quick search{" "}
          <kbd className="rounded border border-border px-1 font-mono text-[10px]">⌘ K</kbd>
        </button>
        <button
          aria-label="Toggle theme"
          onClick={() => setDark(!dark)}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background transition-transform hover:scale-[1.02]"
        >
          <Plus className="size-3.5" />
          Add application
        </button>
      </div>
    </header>
  );
}

function StatStrip() {
  return (
    <div className="grid grid-cols-2 border-b border-border md:grid-cols-4">
      <div className="border-r border-border px-4 py-4 md:px-6">
        <p className="text-xs text-muted-foreground">Active applications</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">12</p>
        <p className="mt-1 text-[11px] text-muted-foreground">+3 this week</p>
      </div>
      <div className="border-r border-border px-4 py-4 md:px-6">
        <p className="text-xs text-muted-foreground">In progress</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">8</p>
        <p className="mt-1 text-[11px] text-muted-foreground">67% of active</p>
      </div>
      <div className="border-r border-border px-4 py-4 md:px-6">
        <p className="text-xs text-muted-foreground">Response rate</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">42%</p>
        <p className="mt-1 text-[11px] text-muted-foreground">+8% vs last month</p>
      </div>
      <div className="px-4 py-4 md:px-6">
        <p className="text-xs text-muted-foreground">Next follow-up</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">Tomorrow</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Vercel · 9:00 AM</p>
      </div>
    </div>
  );
}

function FilterBar({
  query,
  setQuery,
  filter,
  setFilter,
  selected,
  setSelected,
}: {
  query: string;
  setQuery: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  selected: number[];
  setSelected: (v: number[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 md:px-6">
      <div className="relative min-w-[180px] flex-1 md:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search applications..."
          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none ring-offset-background focus:ring-2 focus:ring-ring"
        />
      </div>
      <button className="flex h-8 items-center gap-2 rounded-md border border-border px-2.5 text-xs hover:bg-accent">
        <Filter className="size-3.5 text-muted-foreground" />
        Filters{filter !== "All" && <Badge>{filter}</Badge>}
      </button>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        aria-label="Filter by stage"
        className="h-8 rounded-md border border-border bg-background px-2.5 text-xs outline-none"
      >
        <option>All</option>
        {stages.map((s) => (
          <option key={s}>{s}</option>
        ))}
        <option>Rejected</option>
      </select>
      <button className="flex h-8 items-center gap-2 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:bg-accent">
        <ArrowDownUp className="size-3.5" />
        Sort: Recent
      </button>
      <button className="ml-auto hidden h-8 items-center gap-2 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:bg-accent md:flex">
        <ListFilter className="size-3.5" />
        Saved views
        <ChevronDown className="size-3" />
      </button>
      {selected.length > 0 && (
        <button
          onClick={() => setSelected([])}
          className="flex h-8 items-center gap-1 rounded-md bg-accent px-2.5 text-xs"
        >
          {selected.length} selected <X className="size-3" />
        </button>
      )}
    </div>
  );
}

function ApplicationsView({ onAdd }: { onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<number[]>([]);
  const [active, setActive] = useState(applications[0]);
  const filtered = useMemo(
    () =>
      applications.filter(
        (a) =>
          (filter === "All" || a.stage === filter) &&
          `${a.company} ${a.role}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [filter, query],
  );
  return (
    <>
      <div className="flex items-end justify-between px-4 pb-5 pt-7 md:px-7">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BriefcaseBusiness className="size-3.5" />
            Job search / 2024
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your command center for every opportunity.
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <button className="rounded-md border border-border p-2 text-muted-foreground hover:bg-accent">
            <SlidersHorizontal className="size-4" />
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent"
          >
            <Plus className="size-3.5" /> New entry
          </button>
        </div>
      </div>
      <StatStrip />
      <FilterBar {...{ query, setQuery, filter, setFilter, selected, setSelected }} />
      <div className="flex min-h-[500px] flex-col xl:flex-row">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="hidden grid-cols-[28px_minmax(180px,1.4fr)_minmax(120px,1fr)_100px_110px_90px] gap-3 border-b border-border px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:grid">
            <span></span>
            <span>Company / role</span>
            <span>Stage</span>
            <span>Applied</span>
            <span>Next step</span>
            <span>Priority</span>
          </div>
          <div className="flex flex-col">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item)}
                className={cn(
                  "grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors hover:bg-accent/50 md:grid-cols-[28px_minmax(180px,1.4fr)_minmax(120px,1fr)_100px_110px_90px] md:px-6",
                  active.id === item.id && "bg-accent/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelected(
                      e.target.checked
                        ? [...selected, item.id]
                        : selected.filter((id) => id !== item.id),
                    );
                  }}
                  aria-label={`Select ${item.company}`}
                  className="size-3.5 accent-foreground"
                />
                <div className="flex min-w-0 items-center gap-3">
                  <Logo item={item} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.company}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <Badge
                    tone={
                      item.stage === "Offer"
                        ? "green"
                        : item.stage === "Rejected"
                          ? "red"
                          : "neutral"
                    }
                  >
                    {item.stage}
                  </Badge>
                </div>
                <span className="hidden text-xs text-muted-foreground md:block">
                  {item.date.replace(", 2024", "")}
                </span>
                <span className="hidden truncate text-xs text-muted-foreground md:block">
                  {item.next.split(" · ")[0]}
                </span>
                <span className="hidden text-xs md:block">
                  <Badge tone={item.priority === "High" ? "amber" : "neutral"}>
                    {item.priority}
                  </Badge>
                </span>
                <div className="flex items-center gap-2 md:hidden">
                  <Badge>{item.stage}</Badge>
                  <MoreHorizontal className="size-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-20 text-center">
              <Search className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No applications found</p>
              <p className="text-xs text-muted-foreground">Try a different search or filter.</p>
            </div>
          )}
        </div>
        <Inspector item={active} />
      </div>
    </>
  );
}

function Inspector({ item }: { item: Application }) {
  return (
    <aside className="hidden w-[340px] shrink-0 border-l border-border bg-muted/20 xl:block">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-xs font-medium">Application details</span>
        <button className="rounded p-1 text-muted-foreground hover:bg-accent">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-3">
          <Logo item={item} large />
          <div>
            <h2 className="font-semibold">{item.company}</h2>
            <p className="text-sm text-muted-foreground">{item.role}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.location}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge tone={item.stage === "Offer" ? "green" : "neutral"}>{item.stage}</Badge>
          <Badge tone="amber">{item.priority} priority</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 border-y border-border py-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Applied</p>
            <p className="mt-1 text-xs font-medium">{item.date}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Compensation
            </p>
            <p className="mt-1 text-xs font-medium">{item.compensation}</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Next step
          </p>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2.5">
            <Timer className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium">{item.next.split(" · ")[0]}</p>
              <p className="text-[11px] text-muted-foreground">{item.next.split(" · ")[1]}</p>
            </div>
            <button className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent">
              <Bell className="size-3.5" />
            </button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </p>
          <div className="flex items-center gap-2 text-xs">
            <UserRound className="size-4 text-muted-foreground" />
            {item.contact}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Materials used
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs">
              <FileText className="size-4 text-muted-foreground" />
              {item.resume}
              <Check className="ml-auto size-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Mail className="size-4 text-muted-foreground" />
              Cover letter · Product-led
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
        <button className="mt-1 flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-xs font-medium hover:bg-accent">
          <Paperclip className="size-3.5" />
          View job description
        </button>
      </div>
    </aside>
  );
}

function PipelineView() {
  return (
    <div className="px-4 pb-8 pt-7 md:px-7">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">A visual overview</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Move opportunities forward, one step at a time.
          </p>
        </div>
        <Badge>12 active</Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {[...stages, "Rejected"].map((stage) => (
          <div
            key={stage}
            className="min-w-[240px] flex-1 rounded-lg border border-border bg-muted/20 p-2"
          >
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-xs font-semibold">{stage}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {applications.filter((a) => a.stage === stage).length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {applications
                .filter((a) => a.stage === stage)
                .map((item) => (
                  <button
                    key={item.id}
                    className="rounded-md border border-border bg-background p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Logo item={item} />
                        <div>
                          <p className="text-xs font-medium">{item.company}</p>
                          <p className="text-[11px] text-muted-foreground">{item.role}</p>
                        </div>
                      </div>
                      <MoreHorizontal className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{item.next}</span>
                      <Badge tone={item.priority === "High" ? "amber" : "neutral"}>
                        {item.priority}
                      </Badge>
                    </div>
                  </button>
                ))}
            </div>
            {stage === "Wishlist" && (
              <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:bg-accent">
                <Plus className="size-3.5" />
                Add to wishlist
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyView() {
  const days = ["Mon 26", "Tue 27", "Wed 28", "Thu 29", "Fri 30"];
  const tasks = [
    { day: 0, time: "09:00", title: "Portfolio review", company: "Vercel", type: "Interview" },
    {
      day: 1,
      time: "11:30",
      title: "Follow up with recruiter",
      company: "Linear",
      type: "Follow-up",
    },
    { day: 2, time: "14:00", title: "Tailor application", company: "Arc", type: "Application" },
    { day: 3, time: "10:00", title: "Recruiter call", company: "Notion", type: "Interview" },
  ];
  return (
    <div className="px-4 pb-8 pt-7 md:px-7">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            Week 35 · Aug 26 – Sep 1
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Weekly plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A calm view of what moves your search forward.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>4 focus blocks</Badge>
          <button className="rounded-md border border-border p-2 text-muted-foreground hover:bg-accent">
            <CalendarDays className="size-4" />
          </button>
        </div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Weekly focus</p>
          <p className="mt-2 text-lg font-semibold">Build momentum</p>
          <p className="mt-1 text-xs text-muted-foreground">2 interviews · 1 application</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Time invested</p>
          <p className="mt-2 text-lg font-semibold">6h 20m</p>
          <p className="mt-1 text-xs text-muted-foreground">of 8h weekly goal</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Tasks complete</p>
          <p className="mt-2 text-lg font-semibold">8 / 12</p>
          <p className="mt-1 text-xs text-muted-foreground">67% this week</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Streak</p>
          <p className="mt-2 text-lg font-semibold">12 days</p>
          <p className="mt-1 text-xs text-muted-foreground">Keep showing up</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-5 border-b border-border">
          {days.map((day, i) => (
            <div
              key={day}
              className={cn(
                "border-r border-border px-3 py-3 last:border-0",
                i === 2 && "bg-accent/50",
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {day.split(" ")[0]}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold",
                  i === 2 && "underline decoration-2 underline-offset-4",
                )}
              >
                {day.split(" ")[1]}
              </p>
            </div>
          ))}
        </div>
        <div className="grid min-h-[330px] grid-cols-5 bg-[linear-gradient(to_bottom,transparent_49px,var(--border)_50px)] bg-[size:100%_50px]">
          {days.map((day, i) => (
            <div key={day} className="border-r border-border p-2 last:border-0">
              {tasks
                .filter((t) => t.day === i)
                .map((task) => (
                  <button
                    key={task.title}
                    className="mb-2 w-full rounded-md border border-border bg-background p-2.5 text-left shadow-sm hover:bg-accent"
                  >
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock3 className="size-3" />
                      {task.time}
                    </div>
                    <p className="text-xs font-medium">{task.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{task.company}</p>
                    <span className="mt-2 inline-block text-[10px] text-muted-foreground">
                      {task.type}
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddModal({ close }: { close: () => void }) {
  const field =
    "h-9 rounded-md border border-border bg-background px-3 text-sm font-normal outline-none transition focus:ring-2 focus:ring-ring";
  const area =
    "min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none transition focus:ring-2 focus:ring-ring";
  const label = "flex flex-col gap-1.5 text-xs font-medium";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="add-application-title"
        className="m-0 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background p-0 shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="add-application-title" className="text-lg font-semibold">
              Add application
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Capture every detail while it is fresh.
            </p>
          </div>
          <button
            aria-label="Close dialog"
            onClick={close}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-7">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Role & company
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={cn(label, "sm:col-span-2")}>
                  Company name
                  <input autoFocus placeholder="e.g. Acme Inc." className={field} />
                </label>
                <label className={cn(label, "sm:col-span-2")}>
                  Role / job title
                  <input placeholder="e.g. Senior Product Designer" className={field} />
                </label>
                <label className={label}>
                  Source
                  <select className={field}>
                    <option>Company website</option>
                    <option>LinkedIn</option>
                    <option>Referral</option>
                    <option>Recruiter</option>
                    <option>Job board</option>
                    <option>Networking</option>
                  </select>
                </label>
                <label className={label}>
                  Job type
                  <select className={field}>
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Freelance</option>
                    <option>Internship</option>
                  </select>
                </label>
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Location & links
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Location
                  <input placeholder="City, State or country" className={field} />
                </label>
                <label className={label}>
                  Work mode
                  <select className={field}>
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>On-site</option>
                    <option>Flexible</option>
                  </select>
                </label>
                <label className={cn(label, "sm:col-span-2")}>
                  Job posting URL
                  <input type="url" placeholder="https://..." className={field} />
                </label>
                <label className={cn(label, "sm:col-span-2")}>
                  Company website
                  <input type="url" placeholder="https://company.com" className={field} />
                </label>
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Status & timing
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Status
                  <select className={field}>
                    <option>Wishlist</option>
                    <option>Applied</option>
                    <option>Screening</option>
                    <option>Interview</option>
                    <option>Offer</option>
                    <option>Rejected</option>
                    <option>Withdrawn</option>
                  </select>
                </label>
                <label className={label}>
                  Priority
                  <select className={field}>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Low</option>
                  </select>
                </label>
                <label className={label}>
                  Reply status
                  <select className={field}>
                    <option>No reply yet</option>
                    <option>Replied</option>
                    <option>Follow-up needed</option>
                    <option>Rejected</option>
                  </select>
                </label>
                <label className={label}>
                  Applied date
                  <input type="date" className={field} />
                </label>
                <label className={label}>
                  Next step date
                  <input type="date" className={field} />
                </label>
                <label className={label}>
                  Reminder time
                  <select className={field}>
                    <option>None</option>
                    <option>09:00 AM</option>
                    <option>12:00 PM</option>
                    <option>05:00 PM</option>
                  </select>
                </label>
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Compensation
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Minimum compensation
                  <input placeholder="$160,000" className={field} />
                </label>
                <label className={label}>
                  Maximum compensation
                  <input placeholder="$190,000" className={field} />
                </label>
                <label className={label}>
                  Currency
                  <select className={field}>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>CAD</option>
                  </select>
                </label>
                <label className={label}>
                  Equity / bonus
                  <input placeholder="e.g. Equity + 15% bonus" className={field} />
                </label>
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Materials & outreach
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Resume used
                  <select className={field}>
                    <option>Product Design · v4</option>
                    <option>Growth Design · v2</option>
                    <option>Staff Portfolio · v1</option>
                    <option>Other / upload new</option>
                  </select>
                </label>
                <label className={label}>
                  Cover letter
                  <select className={field}>
                    <option>Product-led companies · v2</option>
                    <option>General design · v1</option>
                    <option>No cover letter</option>
                    <option>Other / upload new</option>
                  </select>
                </label>
                <label className={cn(label, "sm:col-span-2")}>
                  Message sent
                  <textarea
                    placeholder="Paste the message or introduction you sent..."
                    className={area}
                  />
                </label>
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Job description & notes
              </h3>
              <div className="flex flex-col gap-4">
                <label className={label}>
                  Job description
                  <textarea
                    placeholder="Paste the full job description here..."
                    className="min-h-32 rounded-md border border-border bg-background px-3 py-2 text-sm font-normal outline-none transition focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className={label}>
                  Notes
                  <textarea
                    placeholder="Interview prep, research, concerns, follow-ups..."
                    className={area}
                  />
                </label>
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Primary contact
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Contact name
                  <input placeholder="e.g. Maya Chen" className={field} />
                </label>
                <label className={label}>
                  Contact role
                  <input placeholder="Recruiter, hiring manager..." className={field} />
                </label>
                <label className={label}>
                  Email
                  <input type="email" placeholder="name@company.com" className={field} />
                </label>
                <label className={label}>
                  LinkedIn / contact URL
                  <input type="url" placeholder="https://linkedin.com/in/..." className={field} />
                </label>
                <label className={cn(label, "sm:col-span-2")}>
                  Contact notes
                  <textarea
                    placeholder="How you met, what they care about, last touchpoint..."
                    className={area}
                  />
                </label>
              </div>
            </section>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <p className="hidden text-xs text-muted-foreground sm:block">
            You can add more details later.
          </p>
          <div className="ml-auto flex gap-2">
            <button
              onClick={close}
              className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={close}
              className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:opacity-90"
            >
              Save application
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
export default function JobHuntWorkspace() {
  const [variant, setVariant] = useState<Variant>("applications");
  const [dark, setDark] = useState(true);
  const [modal, setModal] = useState(false);
  return (
    <div className={cn(dark && "dark", "min-h-screen bg-background text-foreground")}>
      <div className="flex min-h-screen">
        <Sidebar variant={variant} setVariant={setVariant} />
        <div className="min-w-0 flex-1">
          <Header variant={variant} dark={dark} setDark={setDark} onAdd={() => setModal(true)} />
          <main>
            {variant === "applications" && <ApplicationsView onAdd={() => setModal(true)} />}
            {variant === "pipeline" && <PipelineView />}
            {variant === "weekly" && <WeeklyView />}
          </main>
        </div>
      </div>
      {modal && <AddModal close={() => setModal(false)} />}
    </div>
  );
}
