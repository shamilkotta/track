"use client";

import { useState } from "react";
import Link from "nlite/link";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  signIn,
  signUp,
} from "@/lib/auth-client";
import { useRouter, useSearchParams } from "nlite/navigation";

function callbackURL() {
  return `${window.location.origin}/job/applications`;
}

function resetRedirectURL() {
  return `${window.location.origin}/reset-password`;
}

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";
  const isForgot = mode === "forgot-password";
  const isReset = mode === "reset-password";
  const resetToken = searchParams.get("token");
  const resetTokenError = searchParams.get("error");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResendMessage(null);
    try {
      if (isForgot) {
        const result = await requestPasswordReset({
          email: email.trim(),
          redirectTo: resetRedirectURL(),
        });
        if (result.error) {
          setError(result.error.message ?? "Could not send reset email");
          return;
        }
        setResetSent(true);
        return;
      }

      if (isReset) {
        if (!resetToken) {
          setError("This reset link is invalid or expired.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        const result = await resetPassword({
          newPassword: password,
          token: resetToken,
        });
        if (result.error) {
          setError(result.error.message ?? "Could not reset password");
          return;
        }
        router.push("/sign-in");
        return;
      }

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

  const headerLabel = isForgot
    ? "Forgot password"
    : isReset
      ? "Reset password"
      : isSignUp
        ? "Create workspace"
        : "Sign in";

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-baseline justify-between px-6 py-5 md:px-10">
        <BrandMark />
        <p className="text-sm text-muted-foreground">{headerLabel}</p>
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
        ) : resetSent ? (
          <>
            <h1>Check your email</h1>
            <p className="track-page-lede">
              If an account exists for {email.trim() || "that address"}, we sent a password reset
              link. Open it to choose a new password.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button type="button" size="lg" onClick={() => router.push("/sign-in")}>
                Back to sign in
              </Button>
            </div>
          </>
        ) : isReset && (!resetToken || resetTokenError) ? (
          <>
            <h1>Reset link invalid</h1>
            <p className="track-page-lede">
              This password reset link is invalid or has expired. Request a new one to continue.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button type="button" size="lg" onClick={() => router.push("/forgot-password")}>
                Request a new link
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => router.push("/sign-in")}
              >
                Back to sign in
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1>
              {isForgot
                ? "Reset your password"
                : isReset
                  ? "Choose a new password"
                  : isSignUp
                    ? "Start tracking your search"
                    : "Continue your search"}
            </h1>
            <p className="track-page-lede">
              {isForgot
                ? "Enter your email and we’ll send a reset link if an account exists."
                : isReset
                  ? "Pick a new password for your Trackr account."
                  : isSignUp
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
              {!isReset && (
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
              )}
              {!isForgot && (
                <Field>
                  <FieldLabel>{isReset ? "New password" : "Password"}</FieldLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isSignUp || isReset ? "new-password" : "current-password"}
                    minLength={8}
                    required
                  />
                </Field>
              )}
              {isReset && (
                <Field>
                  <FieldLabel>Confirm password</FieldLabel>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </Field>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" disabled={pending}>
                {pending
                  ? "Working…"
                  : isForgot
                    ? "Send reset link"
                    : isReset
                      ? "Update password"
                      : isSignUp
                        ? "Create account"
                        : "Sign in"}
              </Button>
            </form>
            {mode === "sign-in" && (
              <p className="mt-4 text-sm text-muted-foreground">
                <Link
                  href="/forgot-password"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
            )}
            <p className="mt-8 text-sm text-muted-foreground">
              {isForgot || isReset ? (
                <>
                  Remembered your password?{" "}
                  <Link
                    href="/sign-in"
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
                  <Link
                    href={isSignUp ? "/sign-in" : "/sign-up"}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </Link>
                </>
              )}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
