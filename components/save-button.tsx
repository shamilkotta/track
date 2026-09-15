"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function StatusIcon({ status }: { status: SaveStatus }) {
  const showSpinner = status === "saving";
  const showCheck = status === "saved";

  if (!showSpinner && !showCheck) return null;

  return (
    <span className="relative size-4 shrink-0" aria-hidden>
      <LoaderCircle
        className={cn(
          "absolute inset-0 size-4 animate-spin transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
          showSpinner ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]",
        )}
      />
      <Check
        className={cn(
          "size-4 transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
          showCheck ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]",
        )}
      />
    </span>
  );
}

export function SaveButton({
  onSave,
  disabled = false,
  idleLabel = "Save changes",
  className,
}: {
  onSave: () => Promise<void>;
  disabled?: boolean;
  idleLabel?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const resetTimer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  function clearResetTimer() {
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }

  function flash(next: "saved" | "error") {
    if (!mounted.current) return;
    clearResetTimer();
    setStatus(next);
    resetTimer.current = window.setTimeout(() => {
      if (!mounted.current) return;
      setStatus("idle");
      resetTimer.current = null;
    }, 1600);
  }

  async function handleClick() {
    if (disabled || status === "saving") return;
    clearResetTimer();
    setStatus("saving");
    try {
      await onSave();
      flash("saved");
    } catch {
      flash("error");
    }
  }

  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : idleLabel;

  return (
    <Button
      className={className}
      disabled={disabled || status === "saving"}
      onClick={() => void handleClick()}
      aria-live="polite"
    >
      <StatusIcon status={status} />
      <span
        className={cn(
          "transition-[filter,opacity] duration-200 ease-out motion-reduce:transition-none",
          status === "saving" ? "opacity-80" : "opacity-100",
        )}
      >
        {label}
      </span>
    </Button>
  );
}
