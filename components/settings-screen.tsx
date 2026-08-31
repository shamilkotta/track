"use client";

import { useState } from "react";
import Link from "nlite/link";
import { useRouter } from "nlite/navigation";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient, signOut } from "@/lib/auth-client";
import type { WorkspaceUser } from "@/lib/domain";

export function SettingsScreen({ user }: { user: WorkspaceUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [title, setTitle] = useState(user.title);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col px-4 py-10">
      <div className="mb-8">
        <Link href="/applications" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
            <Target className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Trackr</span>
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          setMessage(null);
          void authClient
            .updateUser({ name: name.trim(), title: title.trim() })
            .then((result) => {
              if (result.error) {
                setError(result.error.message ?? "Could not update profile");
                return;
              }
              setMessage("Profile saved");
            })
            .finally(() => setPending(false));
        }}
      >
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>Title</FieldLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product designer"
          />
        </Field>
        <Button type="submit" size="lg" disabled={pending}>
          Save profile
        </Button>
      </form>

      <form
        className="mt-10 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          setMessage(null);
          void authClient
            .changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
            .then((result) => {
              if (result.error) {
                setError(result.error.message ?? "Could not change password");
                return;
              }
              setCurrentPassword("");
              setNewPassword("");
              setMessage("Password updated");
            })
            .finally(() => setPending(false));
        }}
      >
        <h2 className="text-sm font-semibold">Password</h2>
        <Field>
          <FieldLabel>Current password</FieldLabel>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel>New password</FieldLabel>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" size="lg" variant="outline" disabled={pending}>
          Change password
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}

      <div className="mt-auto flex gap-2 pt-10">
        <Button size="lg" variant="outline" onClick={() => router.push("/applications")}>
          Back to workspace
        </Button>
        <Button
          size="lg"
          variant="destructive"
          onClick={() => {
            void signOut({
              fetchOptions: {
                onSuccess: () => router.push("/sign-in"),
              },
            });
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
