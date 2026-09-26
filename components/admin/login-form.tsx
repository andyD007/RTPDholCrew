"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, signInWithPassword, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction, pwPending] = useActionState<AuthState, FormData>(signInWithPassword, { error: initialError });
  const [mlState, mlAction, mlPending] = useActionState<AuthState, FormData>(sendMagicLink, {});
  const state = mode === "password" ? pwState : mlState;

  return (
    <div className="mt-8">
      <form action={mode === "password" ? pwAction : mlAction} className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        {mode === "password" ? (
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
          </Field>
        ) : null}
        {state.error ? (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p role="status" className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {state.message}
          </p>
        ) : null}
        <Button type="submit" size="lg" loading={mode === "password" ? pwPending : mlPending}>
          {mode === "password" ? "Sign in" : "Email me a sign-in link"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "magic" : "password")}
        className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
      </button>
    </div>
  );
}
