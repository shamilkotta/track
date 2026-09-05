"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CompanyMark } from "@/components/workspace-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Company } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function useCollapsedCompanyGroups(options?: { defaultCollapsed?: boolean }) {
  const defaultCollapsed = options?.defaultCollapsed ?? false;
  // Tracks ids that differ from the default: collapsed when defaultExpanded, expanded when defaultCollapsed
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());

  function isCollapsed(companyId: string) {
    const isToggled = toggled.has(companyId);
    return defaultCollapsed ? !isToggled : isToggled;
  }

  function toggle(companyId: string) {
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }

  return { isCollapsed, toggle };
}

export function CompanyGroupHeaderRow({
  company,
  count,
  label,
  collapsed,
  onToggle,
  selectedCount,
  onSelectAll,
  colSpan = 6,
}: {
  company: Company | undefined;
  count: number;
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  selectedCount: number;
  onSelectAll: (checked: boolean) => void;
  colSpan?: number;
}) {
  const allSelected = selectedCount === count;

  return (
    <TableRow className="bg-muted/40 hover:bg-muted/50">
      <TableCell className="w-10 pl-4 pr-0">
        <Checkbox
          className="after:inset-0"
          checked={allSelected}
          onCheckedChange={(checked) => onSelectAll(checked === true)}
          aria-label={`Select all ${company?.name ?? "company"} ${label}`}
        />
      </TableCell>
      <TableCell colSpan={colSpan - 1}>
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-2 text-left"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
          {company && <CompanyMark logo={company.logo} color={company.color} />}
          <span className="truncate font-medium">{company?.name ?? "Unknown company"}</span>
          <Badge variant="secondary" className="shrink-0">
            {count} {label}
          </Badge>
        </button>
      </TableCell>
    </TableRow>
  );
}

export function GroupedItemIndent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex min-w-0 items-center gap-3 pl-6", className)}>{children}</div>;
}

export function CompanyActivityBadges({
  applicationCount,
  leadCount,
}: {
  applicationCount: number;
  leadCount: number;
}) {
  if (applicationCount === 0 && leadCount === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {applicationCount > 0 && (
        <Badge variant="outline">
          {applicationCount} app{applicationCount === 1 ? "" : "s"}
        </Badge>
      )}
      {leadCount > 0 && (
        <Badge variant="outline">
          {leadCount} lead{leadCount === 1 ? "" : "s"}
        </Badge>
      )}
    </div>
  );
}

export function CompanyActivityList({
  applications,
  leads,
  onOpenApplication,
  onOpenLead,
}: {
  applications: Array<{ id: string; role: string; stage: string }>;
  leads: Array<{ id: string; personName: string; status: string }>;
  onOpenApplication: (id: string) => void;
  onOpenLead: (id: string) => void;
}) {
  if (applications.length === 0 && leads.length === 0) {
    return <p className="text-sm text-muted-foreground">No applications or leads yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Applications</p>
          <div className="flex flex-col gap-1">
            {applications.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto justify-start px-2 py-1.5 text-left"
                onClick={() => onOpenApplication(item.id)}
              >
                <span className="truncate font-medium">{item.role || "Untitled role"}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">{item.stage}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      {leads.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Leads</p>
          <div className="flex flex-col gap-1">
            {leads.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto justify-start px-2 py-1.5 text-left"
                onClick={() => onOpenLead(item.id)}
              >
                <span className="truncate font-medium">{item.personName}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">{item.status}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
