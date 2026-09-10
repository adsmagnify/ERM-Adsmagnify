"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/app/actions/auth";
import {
  Field,
  SubmitButton,
  TextInput,
} from "@/components/form-field";

const initial: AuthState | null = null;

export function ForgotPasswordForm({ resetting }: { resetting: boolean }) {
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    initial
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updatePassword,
    initial
  );

  return (
    <div className="w-full max-w-md">
      <p className="text-sm text-muted-foreground">Adsmagnify</p>
      <h1 className="font-heading mt-3 text-4xl font-semibold tracking-tight">
        {resetting ? "Set a new password" : "Forgot password"}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        {resetting
          ? "Choose a new password for your account."
          : "We’ll send a reset link if that email has an account."}
      </p>

      {resetting ? (
        <form action={updateAction} className="mt-10 flex flex-col gap-5">
          <Field label="New password" htmlFor="password">
            <TextInput
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm password" htmlFor="confirm">
            <TextInput
              id="confirm"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
            />
          </Field>
          {updateState?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {updateState.error}
            </p>
          ) : null}
          <SubmitButton disabled={updatePending}>
            {updatePending ? "Saving…" : "Update password"}
          </SubmitButton>
        </form>
      ) : (
        <form action={resetAction} className="mt-10 flex flex-col gap-5">
          <Field label="Email" htmlFor="email">
            <TextInput
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </Field>
          {resetState?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {resetState.error}
            </p>
          ) : null}
          {resetState?.success ? (
            <p className="text-sm text-[#1f7a5a]" role="status">
              {resetState.success}
            </p>
          ) : null}
          <SubmitButton disabled={resetPending}>
            {resetPending ? "Sending…" : "Send reset link"}
          </SubmitButton>
        </form>
      )}

      <Link
        href="/login"
        className="mt-8 inline-block text-sm text-foreground underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
