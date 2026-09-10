import { TaskCard } from "@/components/task-card";
import type { Task, TaskStatus } from "@/lib/database.types";

const columns: TaskStatus[] = ["To Do", "In Progress", "Done"];

export function TaskBoard({
  tasks,
  namesByUserId,
}: {
  tasks: Task[];
  namesByUserId?: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
      {columns.map((column) => {
        const items = tasks.filter((task) => task.status === column);
        return (
          <section key={column} className="flex min-h-[22rem] flex-col">
            <div className="mb-4 flex items-baseline justify-between px-1">
              <h2 className="font-heading text-xl font-semibold">{column}</h2>
              <span className="text-sm text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-4">
              {items.length === 0 ? (
                <p className="px-3 py-10 text-sm text-muted-foreground">
                  Nothing here yet.
                </p>
              ) : (
                items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    ownerName={namesByUserId?.[task.user_id]}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
