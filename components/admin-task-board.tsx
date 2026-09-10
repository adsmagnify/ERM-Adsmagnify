"use client";

import { useMemo, useState } from "react";
import { TaskBoard } from "@/components/task-board";
import type { Profile, Task } from "@/lib/database.types";
import { todayIstDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export function AdminTaskBoard({
  tasks,
  people,
}: {
  tasks: Task[];
  people: Profile[];
}) {
  const [personId, setPersonId] = useState("all");
  const today = todayIstDate();

  const names = useMemo(
    () =>
      Object.fromEntries(
        people.map((person) => [
          person.id,
          person.full_name?.trim() || person.email || "Employee",
        ])
      ),
    [people]
  );

  const filtered =
    personId === "all"
      ? tasks
      : tasks.filter((task) => task.user_id === personId);

  const overdue = filtered.filter(
    (task) =>
      Boolean(task.due_date) &&
      task.status !== "Done" &&
      task.due_date! < today
  ).length;

  const counts = {
    todo: filtered.filter((task) => task.status === "To Do").length,
    doing: filtered.filter((task) => task.status === "In Progress").length,
    done: filtered.filter((task) => task.status === "Done").length,
  };

  const peopleWithTasks = people.filter((person) =>
    tasks.some((task) => task.user_id === person.id)
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="To do" value={counts.todo} />
        <Stat label="In progress" value={counts.doing} />
        <Stat label="Done" value={counts.done} />
        <Stat label="Overdue" value={overdue} warn />
      </section>

      {peopleWithTasks.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={personId === "all"}
            onClick={() => setPersonId("all")}
          >
            Everyone
          </FilterChip>
          {peopleWithTasks.map((person) => (
            <FilterChip
              key={person.id}
              active={personId === person.id}
              onClick={() => setPersonId(person.id)}
            >
              {names[person.id]}
            </FilterChip>
          ))}
        </div>
      ) : null}

      <TaskBoard tasks={filtered} namesByUserId={names} />
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-white px-5 py-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-heading mt-2 text-3xl font-medium tracking-tight",
          warn && value > 0 && "text-[#b5432f]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-11 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-white"
          : "border border-border bg-white text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
