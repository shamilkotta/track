"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Archive,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ChevronsUpDown,
  CircleHelp,
  FileText,
  FolderOpen,
  GraduationCap,
  Heart,
  Inbox,
  LayoutDashboard,
  Library,
  LogOut,
  Mail,
  MoreHorizontal,
  NotebookPen,
  Route,
  Settings2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command as CommandPalette,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceSummary } from "@/hooks/use-workspace";
import { signOut } from "@/lib/auth-client";
import {
  learningMapPath,
  productModeFromPathname,
  screenFromPathname,
  screenPath,
  userInitials,
  type ProductMode,
  type Screen,
  type WorkspaceUser,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "nlite/navigation";

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

const modeOptions: Array<{
  id: ProductMode;
  label: string;
  description: string;
  icon: typeof Briefcase;
  home: Screen;
}> = [
  {
    id: "job",
    label: "Job search",
    description: "Applications, leads, wishlist",
    icon: Briefcase,
    home: "applications",
  },
  {
    id: "learning",
    label: "Learning",
    description: "Maps, topics, and journal",
    icon: GraduationCap,
    home: "learning",
  },
];

function ModeSwitcher({ mode }: { mode: ProductMode }) {
  const router = useRouter();
  const current = modeOptions.find((option) => option.id === mode) ?? modeOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left outline-none",
          "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
          {current.label}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="w-56">
        {modeOptions.map((option) => {
          const OptionIcon = option.icon;
          const active = option.id === mode;
          return (
            <DropdownMenuItem
              key={option.id}
              className="items-start gap-2.5 py-2"
              onClick={() => {
                if (!active) router.push(screenPath(option.home));
              }}
            >
              <OptionIcon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", active ? "font-semibold" : "font-medium")}>
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              {active ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppSidebar({
  mode,
  screen,
  applicationCount,
  leadCount,
  wishlistCount,
  countsPending,
  user,
}: {
  mode: ProductMode;
  screen: Screen;
  applicationCount: number;
  leadCount: number;
  wishlistCount: number;
  countsPending: boolean;
  user: WorkspaceUser;
}) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const navigate = (path: string) => {
    router.push(path);
    setOpenMobile(false);
  };

  const badge = (count: number) =>
    countsPending ? <Skeleton className="h-4 w-5 rounded-full" /> : count;

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="gap-0 px-2 pt-3 pb-1">
        <ModeSwitcher mode={mode} />
      </SidebarHeader>
      <SidebarContent>
        {mode === "job" ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={screen === "applications"}
                      onClick={() => navigate(screenPath("applications"))}
                    >
                      <Inbox />
                      Applications
                      <SidebarMenuBadge>{badge(applicationCount)}</SidebarMenuBadge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={screen === "leads"}
                      onClick={() => navigate(screenPath("leads"))}
                    >
                      <Mail />
                      Leads
                      <SidebarMenuBadge>{badge(leadCount)}</SidebarMenuBadge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={screen === "wishlist"}
                      onClick={() => navigate(screenPath("wishlist"))}
                    >
                      <Heart />
                      Wishlist
                      <SidebarMenuBadge>{badge(wishlistCount)}</SidebarMenuBadge>
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
                        onClick={() => navigate(screenPath(id))}
                      >
                        <Icon />
                        {label}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Learning</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={screen === "learning"}
                      onClick={() => navigate(screenPath("learning"))}
                    >
                      <LayoutDashboard />
                      Overview
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={screen === "learning-today"}
                      onClick={() => navigate(screenPath("learning-today"))}
                    >
                      <CalendarDays />
                      Today
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={screen === "learning-maps"}
                      onClick={() => navigate(screenPath("learning-maps"))}
                    >
                      <Route />
                      Maps
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Capture</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={screen === "learning-journal"}
                      onClick={() => navigate(screenPath("learning-journal"))}
                    >
                      <NotebookPen />
                      Journal
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={screen === "learning-resources"}
                      onClick={() => navigate(screenPath("learning-resources"))}
                    >
                      <Library />
                      Resources
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/settings")}>
              <Settings2 />
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/help")}>
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
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings2 />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/help")}>
              <CircleHelp />
              Help center
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setOpenMobile(false);
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

function Header({ onSearch }: { onSearch: () => void }) {
  const { state, isMobile, openMobile } = useSidebar();
  const showTrigger = isMobile ? !openMobile : state === "collapsed";

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 px-4 md:px-6">
      {showTrigger ? <SidebarTrigger className="-ml-1" /> : null}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" className="hidden md:inline-flex" onClick={onSearch}>
          Search
          <Kbd>⌘K</Kbd>
        </Button>
      </div>
    </header>
  );
}

export function WorkspaceShell({
  user: initialUser,
  children,
}: {
  user: WorkspaceUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const screen = screenFromPathname(pathname);
  const mode = productModeFromPathname(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const [focus, setFocus] = useState<WorkspaceFocus | null>(null);
  const summaryQuery = useWorkspaceSummary(initialUser);
  const user = summaryQuery.data?.user ?? initialUser;
  const searchIndex = summaryQuery.data?.search;

  const consumeFocus = useCallback(
    (kind: WorkspaceFocus["kind"]) => {
      if (!focus || focus.kind !== kind) return null;
      const id = focus.id;
      setFocus(null);
      return id;
    },
    [focus],
  );

  const focusValue = useMemo(() => ({ focus, setFocus, consumeFocus }), [focus, consumeFocus]);

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

  return (
    <WorkspaceFocusContext.Provider value={focusValue}>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar
          mode={mode}
          screen={screen}
          applicationCount={summaryQuery.data?.counts.applications ?? 0}
          leadCount={summaryQuery.data?.counts.leads ?? 0}
          wishlistCount={summaryQuery.data?.counts.wishlists ?? 0}
          countsPending={summaryQuery.isPending}
          user={user}
        />
        <SidebarInset className="min-h-0 overflow-hidden">
          <Header onSearch={() => setSearchOpen(true)} />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
        <CommandDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          title="Quick search"
          className="sm:max-w-xl"
        >
          <CommandPalette className="min-h-80">
            <CommandInput
              placeholder={
                mode === "learning"
                  ? "Search maps, modules, topics..."
                  : "Search applications, leads, wishlist, companies..."
              }
            />
            <CommandList className="max-h-96">
              <CommandEmpty>No matches.</CommandEmpty>
              {mode === "learning" ? (
                <>
                  <CommandGroup heading="Go to">
                    {(
                      [
                        ["learning", "Overview"],
                        ["learning-today", "Today"],
                        ["learning-maps", "Maps"],
                        ["learning-journal", "Journal"],
                        ["learning-resources", "Resources"],
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
                  <CommandGroup heading="Maps">
                    {(searchIndex?.learningPaths ?? []).map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.title} ${item.subtitle} map`}
                        onSelect={() => {
                          router.push(learningMapPath(item.pathId));
                          setSearchOpen(false);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        <CommandShortcut className="tracking-normal capitalize">
                          {item.subtitle}
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Modules">
                    {(searchIndex?.learningModules ?? []).map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.title} ${item.subtitle} module`}
                        onSelect={() => {
                          setFocus({
                            kind: "learning-module",
                            id: item.id,
                            pathId: item.pathId,
                          });
                          router.push(learningMapPath(item.pathId));
                          setSearchOpen(false);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        <CommandShortcut className="tracking-normal">
                          {item.subtitle}
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Topics">
                    {(searchIndex?.learningTopics ?? []).map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.title} ${item.subtitle} topic`}
                        onSelect={() => {
                          setFocus({
                            kind: "learning-topic",
                            id: item.id,
                            pathId: item.pathId,
                          });
                          router.push(learningMapPath(item.pathId));
                          setSearchOpen(false);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        <CommandShortcut className="tracking-normal">
                          {item.subtitle}
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              ) : (
                <>
                  <CommandGroup heading="Go to">
                    {(
                      [
                        ["applications", "Applications"],
                        ["leads", "Leads"],
                        ["wishlist", "Wishlist"],
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
                    {(searchIndex?.applications ?? []).slice(0, 12).map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.subtitle} ${item.title}`}
                        onSelect={() => {
                          setFocus({ kind: "application", id: item.id });
                          router.push(screenPath(item.archived ? "archive" : "applications"));
                          setSearchOpen(false);
                        }}
                      >
                        {item.subtitle} · {item.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Leads">
                    {(searchIndex?.leads ?? []).slice(0, 12).map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.subtitle} ${item.title}`}
                        onSelect={() => {
                          setFocus({ kind: "lead", id: item.id });
                          router.push(screenPath(item.archived ? "archive" : "leads"));
                          setSearchOpen(false);
                        }}
                      >
                        {item.subtitle} · {item.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Wishlist">
                    {(searchIndex?.wishlists ?? []).slice(0, 12).map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.subtitle} ${item.title}`}
                        onSelect={() => {
                          setFocus({ kind: "wishlist", id: item.id });
                          router.push(screenPath(item.archived ? "archive" : "wishlist"));
                          setSearchOpen(false);
                        }}
                      >
                        {item.subtitle}
                        {item.title ? ` · ${item.title}` : ""}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Companies">
                    {(searchIndex?.companies ?? []).slice(0, 8).map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.name}
                        onSelect={() => {
                          setFocus({ kind: "company", id: company.id });
                          router.push(screenPath("companies"));
                          setSearchOpen(false);
                        }}
                      >
                        {company.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </CommandPalette>
        </CommandDialog>
      </SidebarProvider>
    </WorkspaceFocusContext.Provider>
  );
}
