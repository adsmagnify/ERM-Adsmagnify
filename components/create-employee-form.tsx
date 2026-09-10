"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createEmployee,
  type CreateEmployeeState,
} from "@/app/actions/employees";
import {
  Field,
  SubmitButton,
  TextInput,
} from "@/components/form-field";

const initial: CreateEmployeeState | null = null;

export function CreateEmployeeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createEmployee, initial);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-[20px] border border-border bg-white p-6 sm:p-8"
    >
      <h2 className="font-heading text-xl font-medium">Add employee</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create their login, then share the email and password. They can sign in
        immediately.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[1.1fr_1.2fr_1fr_auto]">
        <Field label="Full name" htmlFor="full_name">
          <TextInput
            id="full_name"
            name="full_name"
            required
            autoComplete="name"
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <TextInput
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <TextInput
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        <SubmitButton disabled={pending} className="md:mt-7">
          {pending ? "Creating…" : "Create login"}
        </SubmitButton>
      </div>
      {state?.error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mt-4 text-sm text-[#1f7a5a]" role="status">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
