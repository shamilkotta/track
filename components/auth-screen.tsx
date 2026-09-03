"use client";

import { useState } from "react";
import Link from "nlite/link";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";
import { useRouter } from "nlite/navigation";

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = isSignUp
        ? await signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
            title: title.trim(),
          })
        : await signIn.email({
            email: email.trim(),
            password,
          });
      if (result.error) {
        setError(result.error.message ?? "Could not continue");
        return;
      }
      router.push("/applications");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not continue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-baseline justify-between px-6 py-5 md:px-10">
        <BrandMark />
        <p className="text-sm text-muted-foreground">{isSignUp ? "Create workspace" : "Sign in"}</p>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <h1>{isSignUp ? "Start tracking your search" : "Continue your search"}</h1>
        <p className="track-page-lede">
          {isSignUp
            ? "Applications, follow-ups, and next steps in one place."
            : "Sign in to open your job search workspace."}
        </p>
        <form className="mt-8 flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          {isSignUp && (
            <>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Product designer"
                />
              </Field>
            </>
          )}
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Working…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="mt-8 text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </main>
    </div>
  );
}
