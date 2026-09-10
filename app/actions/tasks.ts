"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth-user";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";

export type TaskActionState = {
  error?: string;
  success?: boolean;
};

const priorities: TaskPriority[] = ["High", "Medium", "Low"];
const statuses: TaskStatus[] = ["To Do", "In Progress", "Done"];

function asPriority(value: string): TaskPriority | null {
  return priorities.includes(value as TaskPriority)
    ? (value as TaskPriority)
    : null;
}

function asStatus(value: string): TaskStatus | null {
  return statuses.includes(value as TaskStatus) ? (value as TaskStatus) : null;
}

export async function createTask(
  _prev: TaskActionState | null,
  formData: FormData
): Promise<TaskActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const priority = asPriority(String(formData.get("priority") ?? "Medium"));
  const dueDate = String(formData.get("due_date") ?? "").trim();

  if (!title) {
    return { error: "Give the task a title." };
  }

  if (!priority) {
    return { error: "Choose a priority." };
  }

  if (!dueDate) {
    return { error: "Choose a due date." };
  }

  const supabase = await createClient();
  const userId = await getAuthUserId(supabase);

  if (!userId) {
    return { error: "You need to be signed in." };
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title,
    priority,
    status: "To Do",
    due_date: dueDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true };
}

export async function moveTask(taskId: string, status: TaskStatus) {
  if (!asStatus(status)) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  return {};
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  return {};
}
