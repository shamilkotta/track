"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function StatStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="track-stat-strip mx-4 mb-6 md:mx-7">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function ToolbarSkeleton() {
  return (
    <div className="track-toolbar">
      <Skeleton className="h-9 min-w-[180px] flex-1 md:max-w-xs" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

export function TableRowsSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="mx-4 mb-8 space-y-2 md:mx-7">
      <div className="flex gap-3 border-b pb-2">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-3 py-2">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton
              key={col}
              className={col === 0 ? "h-8 w-8 shrink-0 rounded-md" : "h-4 flex-1"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListPageSkeleton({
  stats = true,
  columns = 5,
}: {
  stats?: boolean;
  columns?: number;
}) {
  return (
    <div>
      {stats && <StatStripSkeleton />}
      <ToolbarSkeleton />
      <TableRowsSkeleton columns={columns} />
    </div>
  );
}

export function CardsPageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-3 px-4 pb-8 md:grid-cols-2 md:px-7 xl:grid-cols-3">
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function StackPageSkeleton({
  rows = 6,
  padded = true,
}: {
  rows?: number;
  padded?: boolean;
}) {
  return (
    <div className={padded ? "flex flex-col gap-2 px-4 pb-8 md:px-7" : "flex flex-col gap-2"}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-3 rounded-lg border px-4 py-3">
          <Skeleton className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}
