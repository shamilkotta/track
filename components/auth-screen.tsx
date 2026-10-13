"use client";

import { useState } from "react";
import Link from "nlite/link";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendVerificationEmail, signIn, signUp } from "@/lib/auth-client";
import { useRouter } from "nlite/navigation";

function callbackURL() {
  return `${window.location.origin}/job/applications`;
}

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResendMessage(null);
    try {
      const result = isSignUp
        ? await signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
            title: title.trim(),
            callbackURL: callbackURL(),
          })
        : await signIn.email({
            email: email.trim(),
            password,
            callbackURL: callbackURL(),
          });
      if (result.error) {
        if (result.error.status === 403) {
          setCheckEmail(true);
          setError("Verify your email before signing in. We sent another verification link.");
          return;
        }
        setError(result.error.message ?? "Could not continue");
        return;
      }
      if (isSignUp) {
        setCheckEmail(true);
        return;
      }
      router.push("/job/applications");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not continue");
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email to resend the verification link.");
      return;
    }
    setResendPending(true);
    setError(null);
    setResendMessage(null);
    try {
      const result = await sendVerificationEmail({
        email: trimmed,
        callbackURL: callbackURL(),
      });
      if (result.error) {
        setError(result.error.message ?? "Could not resend verification email");
        return;
      }
      setResendMessage("Verification email sent. Check your inbox.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not resend verification email");
    } finally {
      setResendPending(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-baseline justify-between px-6 py-5 md:px-10">
        <BrandMark />
        <p className="text-sm text-muted-foreground">{isSignUp ? "Create workspace" : "Sign in"}</p>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        {checkEmail ? (
          <>
            <h1>Check your email</h1>
            <p className="track-page-lede">
              We sent a verification link to {email.trim() || "your inbox"}. Open it to finish
              setting up your workspace.
            </p>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            {resendMessage && <p className="mt-4 text-sm text-muted-foreground">{resendMessage}</p>}
            <div className="mt-8 flex flex-col gap-3">
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={resendPending}
                onClick={() => void onResend()}
              >
                {resendPending ? "Sending…" : "Resend verification email"}
              </Button>
              <Button type="button" size="lg" onClick={() => router.push("/sign-in")}>
                Back to sign in
              </Button>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
