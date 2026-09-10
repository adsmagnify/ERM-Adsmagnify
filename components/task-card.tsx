"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTask, moveTask } from "@/app/actions/tasks";
import type { Task, TaskStatus } from "@/lib/database.types";
import { formatIstDate, todayIstDate } from "@/lib/time";
import { cn } from "@/lib/utils";

const columns: TaskStatus[] = ["To Do", "In Progress", "Done"];

const priorityDot: Record<Task["priority"], string> = {
  High: "bg-[#b5432f]",
  Medium: "bg-[#c4a35a]",
  Low: "bg-[#1f7a5a]",
};

export function TaskCard({
  task,
  ownerName,
}: {
  task: Task;
  ownerName?: string;
}) {
  const [pending, startTransition] = useTransition();
  const today = todayIstDate();
  const overdue =
    Boolean(task.due_date) &&
    task.status !== "Done" &&
    task.due_date! < today;

  function onMove(status: TaskStatus) {
    startTransition(async () => {
      const result = await moveTask(task.id, status);
      if (result.error) toast.error(result.error);
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <article
      className={cn(
        "rounded-[20px] border bg-white p-5 sm:p-6",
        overdue ? "border-[#b5432f]/40" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-1.5 size-2.5 shrink-0 rounded-full",
              priorityDot[task.priority]
            )}
            title={`${task.priority} priority`}
            aria-label={`${task.priority} priority`}
          />
          <div>
            <h3
              className={cn(
                "font-heading text-lg leading-snug font-medium",
                task.status === "Done" && "text-muted-foreground line-through"
              )}
            >
              {task.title}
            </h3>
            {ownerName ? (
              <p className="mt-1 text-sm text-muted-foreground">{ownerName}</p>
            ) : null}
            <p
              className={cn(
                "mt-2 text-sm",
                overdue ? "font-medium text-[#b5432f]" : "text-muted-foreground"
              )}
            >
              {overdue ? "Overdue · " : "Due "}
              {task.due_date ? formatIstDate(task.due_date) : "—"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label={`Delete ${task.title}`}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-[#b5432f] disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {columns
          .filter((column) => column !== task.status)
          .map((column) => (
            <button
              key={column}
              type="button"
              disabled={pending}
              onClick={() => onMove(column)}
              className="h-10 cursor-pointer rounded-full border border-border bg-transparent px-3 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {column}
            </button>
          ))}
      </div>
    </article>
  );
}
