"use client";

import { Button } from "@/components/ui/button";

export function ActionErrorBanner({
  error,
  onDismiss,
}: {
  error: string | null;
  onDismiss: () => void;
}) {
  if (!error) return null;
  return (
    <div className="flex items-center justify-between border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
      <span>{error}</span>
      <Button size="xs" variant="ghost" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}

export function failMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "Something went wrong";
}
