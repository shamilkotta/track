"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Filter, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import {
  CompanyGroupHeaderRow,
  GroupedItemIndent,
  useCollapsedCompanyGroups,
} from "@/components/company-group-rows";
import {
  CompanyMark,
  CompanyPicker,
  NativeSelectField,
  PriorityBadge,
  WishlistStatusBadge,
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
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
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
import { Textarea } from "@/components/ui/textarea";
import {
  emptyWishlistContact,
  emptyWishlistFormValues,
  formatDisplayDate,
  formatTagsInput,
  formValuesToWishlistPatch,
  isPriority,
  isReminderTime,
  isWishlistSortKey,
  isWishlistStatus,
  nextStepSummary,
  parseTagsInput,
  priorities,
  reminderTimes,
  valuesFromWishlist,
  wishlistSortLabels,
  wishlistStatuses,
  type Company,
  type Priority,
  type ReminderTime,
  type SavedView,
  type Wishlist,
  type WishlistFormValues,
  type WishlistSortKey,
  type WishlistStatus,
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

function TagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={formatTagsInput(value)}
      onChange={(e) => onChange(parseTagsInput(e.target.value))}
      placeholder={placeholder}
    />
  );
}

function WishlistFields({
  companies,
  values,
  setValues,
  onCreateCompany,
}: {
  companies: Company[];
  values: WishlistFormValues;
  setValues: (patch: Partial<WishlistFormValues>) => void;
  onCreateCompany: (name: string) => Promise<string>;
}) {
  return (
    <div className="flex flex-col gap-7">
      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Company
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>Company name</FieldLabel>
            <CompanyPicker
              companies={companies}
              value={values.companyId}
              onChange={(id) => {
                const company = companies.find((item) => item.id === id);
                setValues({
                  companyId: id,
                  ...(company?.website && !values.companyWebsite
                    ? { companyWebsite: company.website }
                    : {}),
                });
              }}
              onCreate={onCreateCompany}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Company website</FieldLabel>
            <Input
              type="url"
              value={values.companyWebsite}
              onChange={(e) => setValues({ companyWebsite: e.target.value })}
              placeholder="https://company.com"
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>What interests you</FieldLabel>
            <Input
              value={values.interest}
              onChange={(e) => setValues({ interest: e.target.value })}
              placeholder="e.g. Design systems, infra roles, company culture"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Status & timing
        </FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <NativeSelectField
              value={values.status}
              onChange={(status: WishlistStatus) => setValues({ status })}
              options={wishlistStatuses}
              guard={isWishlistStatus}
            />
          </Field>
          <Field>
            <FieldLabel>Priority</FieldLabel>
            <NativeSelectField
              value={values.priority}
              onChange={(priority: Priority) => setValues({ priority })}
              options={priorities}
              guard={isPriority}
            />
          </Field>
          <Field>
            <FieldLabel>Next step date</FieldLabel>
            <Input
              type="date"
              value={values.nextStepDate}
              onChange={(e) => setValues({ nextStepDate: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>Reminder</FieldLabel>
            <NativeSelectField
              value={values.reminderTime}
              onChange={(reminderTime: ReminderTime) => setValues({ reminderTime })}
              options={reminderTimes}
              guard={isReminderTime}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Next step</FieldLabel>
            <Input
              value={values.nextStepLabel}
              onChange={(e) => setValues({ nextStepLabel: e.target.value })}
              placeholder="e.g. Find hiring manager, check careers page"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet>
        <div className="mb-3 flex items-center justify-between">
          <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Contacts
          </FieldLegend>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => setValues({ contacts: [...values.contacts, emptyWishlistContact()] })}
          >
            <Plus /> Add contact
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {values.contacts.map((contact, index) => (
            <div key={contact.id} className="rounded-lg border border-foreground/10 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Contact {index + 1}</p>
                {values.contacts.length > 1 && (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() =>
                      setValues({
                        contacts: values.contacts.filter((item) => item.id !== contact.id),
                      })
                    }
                  >
                    <Trash2 />
                    <span className="sr-only">Remove contact</span>
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    value={contact.name}
                    onChange={(e) =>
                      setValues({
                        contacts: values.contacts.map((item) =>
                          item.id === contact.id ? { ...item, name: e.target.value } : item,
                        ),
                      })
                    }
                    placeholder="e.g. Maya Chen"
                  />
                </Field>
                <Field>
                  <FieldLabel>Role</FieldLabel>
                  <Input
                    value={contact.role}
                    onChange={(e) =>
                      setValues({
                        contacts: values.contacts.map((item) =>
                          item.id === contact.id ? { ...item, role: e.target.value } : item,
                        ),
                      })
                    }
                    placeholder="Recruiter, EM, founder..."
                  />
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    type="email"
                    value={contact.email}
                    onChange={(e) =>
                      setValues({
                        contacts: values.contacts.map((item) =>
                          item.id === contact.id ? { ...item, email: e.target.value } : item,
                        ),
                      })
                    }
                    placeholder="maya@company.com"
                  />
                </Field>
                <Field>
                  <FieldLabel>Phone</FieldLabel>
                  <Input
                    value={contact.phone}
                    onChange={(e) =>
                      setValues({
                        contacts: values.contacts.map((item) =>
                          item.id === contact.id ? { ...item, phone: e.target.value } : item,
                        ),
                      })
                    }
                    placeholder="+1..."
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Profile / link</FieldLabel>
                  <Input
                    type="url"
                    value={contact.url}
                    onChange={(e) =>
                      setValues({
                        contacts: values.contacts.map((item) =>
                          item.id === contact.id ? { ...item, url: e.target.value } : item,
                        ),
                      })
                    }
                    placeholder="https://linkedin.com/in/..."
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Contact notes</FieldLabel>
                  <Textarea
                    value={contact.notes}
                    onChange={(e) =>
                      setValues({
                        contacts: values.contacts.map((item) =>
                          item.id === contact.id ? { ...item, notes: e.target.value } : item,
                        ),
                      })
                    }
                    placeholder="How you know them, best channel, last touch..."
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Notes
        </FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              value={values.notes}
              onChange={(e) => setValues({ notes: e.target.value })}
              placeholder="Why this company, research notes, warm intro paths..."
            />
          </Field>
          <Field>
            <FieldLabel>Tags</FieldLabel>
            <TagsInput
              value={values.tags}
              onChange={(tags) => setValues({ tags })}
              placeholder="Dream job, Remote, Series B..."
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}

function computeWishlistStats(items: Wishlist[], companies: Company[]) {
  const active = items.filter((item) => !item.archived);
  const researching = active.filter(
    (item) => item.status === "Researching" || item.status === "Ready",
  );
  const withContacts = active.filter((item) => item.contacts.some((c) => c.name || c.email));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = active
    .filter((item) => item.nextStepDate && item.nextStepDate >= today)
    .sort((a, b) => a.nextStepDate.localeCompare(b.nextStepDate))[0];
  const company = upcoming ? companies.find((c) => c.id === upcoming.companyId) : undefined;
  return [
    {
      label: "Saved companies",
      value: String(active.length),
      hint: `${items.length} total including archive`,
    },
    {
      label: "In motion",
      value: String(researching.length),
      hint: active.length
        ? `${Math.round((researching.length / active.length) * 100)}% researching or ready`
        : "No active items",
    },
    {
      label: "With contacts",
      value: String(withContacts.length),
      hint: `${active.length - withContacts.length} still need a person`,
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

function WishlistStatStrip({ items, companies }: { items: Wishlist[]; companies: Company[] }) {
  const stats = computeWishlistStats(items, companies);
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

export function WishlistDetailDrawer({
  item,
  company,
  companies,
  open,
  onOpenChange,
  onPatch,
  onDelete,
  onRestore,
  readOnly = false,
  onCreateCompany,
}: {
  item: Wishlist;
  company: Company | undefined;
  companies: Company[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (id: string, patch: Partial<Wishlist>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore?: () => Promise<void>;
  readOnly?: boolean;
  onCreateCompany: (name: string) => Promise<string>;
}) {
  const [draft, setDraft] = useState(() => valuesFromWishlist(item));
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function setValues(patch: Partial<WishlistFormValues>) {
    if (readOnly) return;
    setDraft((current) => ({ ...current, ...patch }));
  }

  function flashSaved() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }

  function patchImmediate(patch: Partial<Wishlist>) {
    if (readOnly) return;
    void onPatch(item.id, patch).then(flashSaved);
  }

  function saveAll() {
    if (readOnly) return;
    const patch = formValuesToWishlistPatch(draft);
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
              Wishlist details
              {savedFlash && (
                <span className="text-xs font-normal text-muted-foreground">Saved</span>
              )}
            </SheetTitle>
            <SheetDescription>
              {company?.name ?? "Unknown"}
              {item.interest ? ` · ${item.interest}` : ""}
              {readOnly ? " · Archived" : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div {...(readOnly ? { inert: true } : {})}>
              <div className="flex items-start gap-3 px-4 pt-4">
                {company && <CompanyMark logo={company.logo} color={company.color} large />}
                <div className="min-w-0">
                  <p className="font-semibold">{company?.name ?? "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">
                    {draft.interest || "No interest noted"}
                  </p>
                </div>
              </div>
              <div className="p-4 pt-4">
                <WishlistFields
                  companies={companies}
                  values={draft}
                  setValues={(patch) => {
                    setValues(patch);
                    const immediateKeys = ["status", "priority", "reminderTime"] as const;
                    const immediate: Partial<Wishlist> = {};
                    for (const key of immediateKeys) {
                      if (key in patch) {
                        Object.assign(immediate, { [key]: patch[key] });
                      }
                    }
                    if (Object.keys(immediate).length > 0) patchImmediate(immediate);
                  }}
                  onCreateCompany={onCreateCompany}
                />
              </div>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t">
            <p className="mr-auto text-xs text-muted-foreground">
              {item.contacts.length} contact{item.contacts.length === 1 ? "" : "s"} ·{" "}
              {formatDisplayDate(item.createdAt.slice(0, 10))}
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
        title="Delete this wishlist item?"
        description="This permanently removes the wishlist entry. This cannot be undone."
        onConfirm={() => onDelete(item.id)}
      />
    </>
  );
}

function AddWishlistModal({
  open,
  onOpenChange,
  companies,
  onCreateCompany,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onCreateCompany: (name: string) => Promise<string>;
  onSave: (data: WishlistFormValues) => Promise<void>;
}) {
  const [values, setValuesState] = useState(emptyWishlistFormValues);
  const [saving, setSaving] = useState(false);
  const canSave = Boolean(values.companyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>New wishlist</DialogTitle>
          <DialogDescription>
            Save companies you want to watch, with contacts and research notes.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <WishlistFields
            companies={companies}
            values={values}
            setValues={(patch) => setValuesState((current) => ({ ...current, ...patch }))}
            onCreateCompany={onCreateCompany}
          />
        </div>
        <DialogFooter className="m-0 shrink-0 rounded-none border-t sm:justify-between">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Company website also updates the company directory when empty.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setValuesState(emptyWishlistFormValues());
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
                    setValuesState(emptyWishlistFormValues());
                  })
                  .finally(() => setSaving(false));
              }}
            >
              Save wishlist
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WishlistView({
  wishlists,
  companies,
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
  onCreate,
  savedViews,
  onSaveView,
  onDeleteView,
}: {
  wishlists: Wishlist[];
  companies: Company[];
  density: Density;
  setDensity: (density: Density) => void;
  groupByCompany: boolean;
  setGroupByCompany: (value: boolean) => void;
  focusId?: string | null;
  onFocusConsumed?: () => void;
  onPatch: (id: string, patch: Partial<Wishlist>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulk: (ids: string[], action: "archive" | "delete") => Promise<void>;
  onCreateCompany: (name: string) => Promise<string>;
  onCreate: (data: WishlistFormValues) => Promise<void>;
  savedViews: SavedView[];
  onSaveView: (view: Omit<SavedView, "id">) => Promise<void>;
  onDeleteView: (id: string) => Promise<void>;
}) {
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | WishlistStatus>("All");
  const [sort, setSort] = useState<WishlistSortKey>("recent");
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { isCollapsed, toggle } = useCollapsedCompanyGroups();

  useEffect(() => {
    if (!focusId) return;
    setActiveId(focusId);
    onFocusConsumed?.();
  }, [focusId, onFocusConsumed]);

  const companyById = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );

  const filtered = useMemo(() => {
    const rows = wishlists.filter((item) => {
      const company = companyById[item.companyId];
      const contactNames = item.contacts.map((c) => `${c.name} ${c.role}`).join(" ");
      const hay =
        `${company?.name ?? ""} ${item.interest} ${contactNames} ${item.tags.join(" ")} ${item.notes}`.toLowerCase();
      if (filter !== "All" && item.status !== filter) return false;
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(item.priority))
        return false;
      return hay.includes(query.toLowerCase());
    });
    const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
    const statusRank = Object.fromEntries(wishlistStatuses.map((status, index) => [status, index]));
    rows.sort((a, b) => {
      if (sort === "company") {
        return (companyById[a.companyId]?.name ?? "").localeCompare(
          companyById[b.companyId]?.name ?? "",
        );
      }
      if (sort === "status") return (statusRank[a.status] ?? 0) - (statusRank[b.status] ?? 0);
      if (sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
      return b.createdAt.localeCompare(a.createdAt);
    });
    return rows;
  }, [companyById, filter, query, selectedPriorities, sort, wishlists]);

  const companyGroups = useMemo(
    () => (groupByCompanyEnabled ? groupByCompany(filtered, companyById) : []),
    [companyById, filtered, groupByCompanyEnabled],
  );

  const active = wishlists.find((item) => item.id === activeId) ?? null;

  function toggleFilter<T extends string>(list: T[], value: T, setList: (next: T[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function contactSummary(item: Wishlist) {
    const named = item.contacts.filter((c) => c.name.trim());
    if (named.length === 0) return "No contacts";
    if (named.length === 1) return named[0]!.name;
    return `${named[0]!.name} +${named.length - 1}`;
  }

  return (
    <>
      <div className="track-page-header">
        <div>
          <h1>Companies you want to watch</h1>
          <p className="track-page-lede">
            Contacts, notes, and next steps before an application exists.
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
            <Plus /> New wishlist
          </Button>
        </div>
      </div>
      <WishlistStatStrip items={wishlists} companies={companies} />
      <div className="track-toolbar">
        <div className="relative min-w-[180px] flex-1 md:max-w-xs">
          <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wishlist..."
            className="pl-8"
            aria-label="Search wishlist"
          />
        </div>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            <Filter />
            Filters
            {selectedPriorities.length > 0 && (
              <Badge variant="secondary">{selectedPriorities.length}</Badge>
            )}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
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
              {selectedPriorities.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setSelectedPriorities([])}>
                  Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Select
          value={filter}
          onValueChange={(value) => {
            if (value === "All" || isWishlistStatus(value)) setFilter(value);
          }}
        >
          <SelectTrigger aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            {wishlistStatuses.map((status) => (
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
            Sort: {wishlistSortLabels[sort]}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => {
                if (isWishlistSortKey(value)) setSort(value);
              }}
            >
              {Object.entries(wishlistSortLabels).map(([key, label]) => (
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
            screen: "wishlist",
            query,
            stage: filter,
            sort,
            priorities: selectedPriorities,
            replyStatuses: [],
            workModes: [],
            sources: [],
            year: "all",
          }}
          onSave={onSaveView}
          onDelete={onDeleteView}
          onApply={(view) => {
            setQuery(view.query);
            if (view.stage === "All" || isWishlistStatus(view.stage)) setFilter(view.stage);
            if (isWishlistSortKey(view.sort)) setSort(view.sort);
            setSelectedPriorities(view.priorities);
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
            <TableHead>Company</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Next step</TableHead>
            <TableHead>Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupByCompanyEnabled
            ? companyGroups.flatMap((group) => {
                const groupSelected = group.items.filter((item) => selected.includes(item.id));
                const renderRow = (item: Wishlist, grouped: boolean) => {
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
                          aria-label={`Select ${company?.name ?? "wishlist item"}`}
                        />
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => setActiveId(item.id)}>
                        {grouped ? (
                          <GroupedItemIndent>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {item.interest || "Wishlisted"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {contactSummary(item)}
                              </p>
                            </div>
                          </GroupedItemIndent>
                        ) : (
                          <div className="flex min-w-0 items-center gap-3">
                            {company && <CompanyMark logo={company.logo} color={company.color} />}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{company?.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.interest || "No interest noted"}
                              </p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className="hidden cursor-pointer text-muted-foreground md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        {contactSummary(item)}
                      </TableCell>
                      <TableCell
                        className="hidden cursor-pointer md:table-cell"
                        onClick={() => setActiveId(item.id)}
                      >
                        <WishlistStatusBadge status={item.status} />
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
                    label="items"
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
                    colSpan={6}
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
                        aria-label={`Select ${company?.name ?? "wishlist item"}`}
                      />
                    </TableCell>
                    <TableCell className="cursor-pointer" onClick={() => setActiveId(item.id)}>
                      <div className="flex min-w-0 items-center gap-3">
                        {company && <CompanyMark logo={company.logo} color={company.color} />}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{company?.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.interest || "No interest noted"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell
                      className="hidden cursor-pointer text-muted-foreground md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      {contactSummary(item)}
                    </TableCell>
                    <TableCell
                      className="hidden cursor-pointer md:table-cell"
                      onClick={() => setActiveId(item.id)}
                    >
                      <WishlistStatusBadge status={item.status} />
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
          <p className="text-sm font-medium">No wishlist items found</p>
          <p className="text-xs text-muted-foreground">Try a different search or filter.</p>
        </div>
      )}
      {active && (
        <WishlistDetailDrawer
          key={active.id}
          item={active}
          company={companyById[active.companyId]}
          companies={companies}
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
        />
      )}
      <AddWishlistModal
        open={modal}
        onOpenChange={setModal}
        companies={companies}
        onCreateCompany={onCreateCompany}
        onSave={onCreate}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Delete ${selected.length} wishlist item${selected.length === 1 ? "" : "s"}?`}
        description="Selected wishlist items will be permanently removed. This cannot be undone."
        onConfirm={async () => {
          await onBulk(selected, "delete");
          setSelected([]);
        }}
      />
    </>
  );
}
