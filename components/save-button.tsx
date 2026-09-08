"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type SaveStatus = "idle" | "saving" | "saved" | "error";

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
      {status === "saving" ? <LoaderCircle className="animate-spin" /> : null}
      {status === "saved" ? <Check /> : null}
      {label}
    </Button>
  );
}
