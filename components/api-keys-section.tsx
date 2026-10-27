"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type ApiKeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: Date | string;
  lastRequest: Date | string | null;
};

const apiKeysQueryKey = ["settings", "api-keys"] as const;

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function formatDate(value: Date | string) {
  return dateFormat.format(new Date(value));
}

function formatLastUsed(value: Date | string | null) {
  if (!value) return "Never used";
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) {
      return `Used ${relativeFormat.format(Math.round(seconds / size), unit)}`;
    }
  }
  return "Used just now";
}

async function listKeys(): Promise<ApiKeyRow[]> {
  const result = await authClient.apiKey.list();
  if (result.error) throw new Error(result.error.message ?? "Could not load API keys");
  return [...(result.data?.apiKeys ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function ApiKeysSection() {
  const queryClient = useQueryClient();
  const keys = useQuery({ queryKey: apiKeysQueryKey, queryFn: listKeys });
  const [createOpen, setCreateOpen] = useState(false);
  const [revoking, setRevoking] = useState<ApiKeyRow | null>(null);

  const revoke = useMutation({
    mutationFn: async (keyId: string) => {
      const result = await authClient.apiKey.delete({ keyId });
      if (result.error) throw new Error(result.error.message ?? "Could not revoke key");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey }),
  });

  const rows = keys.data ?? [];

  return (
    <section className="mt-12 flex flex-col gap-4" aria-labelledby="api-keys-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="api-keys-heading">API keys</h2>
          <p className="track-page-lede">
            Let an agent such as client-hunter read and write your clients through the agent API.
          </p>
        </div>
        {rows.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            New key
          </Button>
        )}
      </div>

      {keys.isPending ? (
        <div className="h-[4.5rem] animate-pulse rounded-lg border border-border bg-muted/40" />
      ) : keys.isError ? (
        <p className="text-sm text-destructive">{keys.error.message}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-8 text-center">
          <KeyRound className="size-5 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-medium">No API keys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one for each agent so you can revoke it on its own.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Create API key
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name || "Untitled key"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  <span className="font-mono">{row.start ? `${row.start}…` : "—"}</span>
                  {" · "}Created {formatDate(row.createdAt)}
                  {" · "}
                  {formatLastUsed(row.lastRequest)}
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={revoke.isPending && revoke.variables === row.id}
                onClick={() => setRevoking(row)}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })}
      />

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
        title={`Revoke "${revoking?.name || "Untitled key"}"?`}
        description="Anything using this key stops working right away. This can't be undone."
        confirmLabel="Revoke key"
        onConfirm={async () => {
          if (revoking) await revoke.mutateAsync(revoking.id);
        }}
      />
    </section>
  );
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  function close(next: boolean) {
    if (next || pending) return;
    onOpenChange(false);
    // reset after the close animation so the revealed key doesn't flash back to the form
    window.setTimeout(() => {
      setName("");
      setSecret(null);
      setError(null);
      setCopied(false);
    }, 200);
  }

  async function create() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.apiKey.create({ name: name.trim() });
      if (result.error || !result.data) {
        setError(result.error?.message ?? "Could not create key");
        return;
      }
      setSecret(result.data.key);
      onCreated();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your new key</DialogTitle>
              <DialogDescription>
                This is the only time it's shown. Store it somewhere safe, such as the agent's
                secret settings.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Input
                readOnly
                value={secret}
                aria-label="API key"
                className="font-mono text-xs"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label={copied ? "Copied" : "Copy key"}
                onClick={() => {
                  void navigator.clipboard.writeText(secret).then(() => setCopied(true));
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Name it after the agent that will use it, so you know what to revoke later.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="client-hunter"
                maxLength={64}
                required
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => close(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || name.trim() === ""}>
                Create key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
