import { AddTaskForm } from "@/components/add-task-form";
import { AdminTaskBoard } from "@/components/admin-task-board";
import { TaskBoard } from "@/components/task-board";
import type { Profile, Task } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { supabase, user, isAdmin } = await requireProfile();

  if (isAdmin) {
    const [{ data: rows }, { data: people }] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, user_id, title, priority, status, due_date, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, created_at, clock_in_by, clock_out_after, wednesday_clock_in_by"
        )
        .order("created_at", { ascending: true }),
    ]);

    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
        <div>
          <h2 className="font-heading text-xl font-medium">All tasks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every employee board, in one place.
          </p>
        </div>
        <AdminTaskBoard
          tasks={(rows ?? []) as Task[]}
          people={(people ?? []) as Profile[]}
        />
      </main>
    );
  }

  const { data: rows } = await supabase
    .from("tasks")
    .select("id, user_id, title, priority, status, due_date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <AddTaskForm />
      <TaskBoard tasks={(rows ?? []) as Task[]} />
    </main>
  );
}
