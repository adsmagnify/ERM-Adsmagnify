"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTask, type TaskActionState } from "@/app/actions/tasks";
import {
  Field,
  SubmitButton,
  TextInput,
} from "@/components/form-field";

const initial: TaskActionState | null = null;

export function AddTaskForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createTask, initial);

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold">Add a task</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            It lands in To Do. Move it when you start.
          </p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[1.4fr_0.8fr_0.9fr_auto]">
        <Field label="Title" htmlFor="title">
          <TextInput
            id="title"
            name="title"
            required
            placeholder="Write the brief, send the report…"
          />
        </Field>
        <Field label="Priority" htmlFor="priority">
          <select
            id="priority"
            name="priority"
            defaultValue="Medium"
            className="h-12 w-full cursor-pointer rounded-2xl border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </Field>
        <Field label="Due date" htmlFor="due_date">
          <TextInput id="due_date" name="due_date" type="date" required />
        </Field>
        <SubmitButton disabled={pending} className="md:mt-7">
          {pending ? "Adding…" : "Add task"}
        </SubmitButton>
      </div>
      {state?.error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
