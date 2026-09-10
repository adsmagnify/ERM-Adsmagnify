"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/app/actions/auth";
import {
  Field,
  SubmitButton,
  TextInput,
} from "@/components/form-field";

const initial: AuthState | null = null;

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <div className="w-full max-w-md">
      <p className="text-sm text-muted-foreground">Adsmagnify</p>
      <h1 className="font-heading mt-3 text-4xl font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Sign in with the email and password your admin gave you.
      </p>

      <form action={action} className="mt-10 flex flex-col gap-5">
        <Field label="Email" htmlFor="email">
          <TextInput
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <TextInput
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
        {state?.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        <SubmitButton disabled={pending}>
          {pending ? "Please wait…" : "Sign in"}
        </SubmitButton>
      </form>

      <Link
        href="/forgot-password"
        className="mt-8 inline-block text-sm text-foreground underline-offset-4 hover:underline"
      >
        Forgot password
      </Link>
    </div>
  );
}
