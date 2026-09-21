import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatIstMonth,
  monthCalendar,
  shiftMonth,
  todayIstDate,
  type CalendarCell,
} from "@/lib/time";
import { isWeeklyOff, weeklyOffReason } from "@/lib/workdays";

export type DayPresence = {
  clocked: number;
  halfDay: number;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AdminMonthCalendar({
  workDate,
  presence,
}: {
  workDate: string;
  presence: Record<string, DayPresence>;
}) {
  const today = todayIstDate();
  const cells = monthCalendar(workDate);
  const previous = shiftMonth(workDate, -1);
  const next = shiftMonth(workDate, 1);

  return (
    <section className="rounded-[20px] border border-border bg-white px-4 py-5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={adminDayHref(previous)}
          prefetch
          aria-label={`Previous month, ${formatIstMonth(previous)}`}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="text-center">
          <p className="font-heading text-lg font-medium tracking-tight">
            {formatIstMonth(workDate)}
          </p>
          {workDate !== today ? (
            <Link
              href="/admin"
              prefetch
              className="mt-0.5 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Back to today
            </Link>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">Pick a day</p>
          )}
        </div>
        <Link
          href={adminDayHref(next)}
          prefetch
          aria-label={`Next month, ${formatIstMonth(next)}`}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-5" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <p
            key={label}
            className="pb-1 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            {label}
          </p>
        ))}
        {cells.map((cell) => (
          <CalendarDay
            key={cell.date}
            cell={cell}
            selected={cell.date === workDate}
            isToday={cell.date === today}
            presence={presence[cell.date]}
          />
        ))}
      </div>
    </section>
  );
}

function CalendarDay({
  cell,
  selected,
  isToday,
  presence,
}: {
  cell: CalendarCell;
  selected: boolean;
  isToday: boolean;
  presence?: DayPresence;
}) {
  const dayNumber = Number(cell.date.slice(8, 10));
  const clocked = presence?.clocked ?? 0;
  const halfDay = presence?.halfDay ?? 0;
  const off = isWeeklyOff(cell.date);
  const label = dateLabel(cell.date, clocked, halfDay, selected, isToday, off);

  return (
    <Link
      href={adminDayHref(cell.date)}
      prefetch
      aria-label={label}
      aria-current={selected ? "date" : undefined}
      className={cn(
        "flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-sm transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        selected
          ? "bg-foreground text-white"
          : isToday
            ? "bg-muted text-foreground"
            : off
              ? "text-muted-foreground hover:bg-muted"
              : "text-foreground hover:bg-muted",
        !cell.inMonth && !selected ? "text-muted-foreground/50" : null
      )}
    >
      <span className="tabular-nums leading-none">{dayNumber}</span>
      <span className="mt-1.5 flex h-1.5 items-center justify-center gap-0.5">
        {clocked > 0 ? (
          <span
            className={cn(
              "size-1.5 rounded-full",
              selected ? "bg-white" : "bg-[#1f7a5a]"
            )}
          />
        ) : off ? (
          <span
            className={cn(
              "size-1.5 rounded-full",
              selected ? "bg-white/40" : "bg-border"
            )}
          />
        ) : (
          <span className="size-1.5" />
        )}
        {halfDay > 0 ? (
          <span
            className={cn(
              "size-1.5 rounded-full",
              selected ? "bg-[#f3c4bb]" : "bg-[#b5432f]"
            )}
          />
        ) : null}
      </span>
    </Link>
  );
}

function adminDayHref(date: string) {
  return date === todayIstDate() ? "/admin" : `/admin?date=${date}`;
}

function dateLabel(
  date: string,
  clocked: number,
  halfDay: number,
  selected: boolean,
  isToday: boolean,
  off: boolean
) {
  const readable = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+05:30`));

  const parts = [readable];
  if (isToday) parts.push("today");
  if (selected) parts.push("selected");
  if (off) parts.push(weeklyOffReason(date).replace(/\.$/, ""));
  if (clocked > 0) {
    parts.push(`${clocked} clocked in`);
  }
  if (halfDay > 0) {
    parts.push(`${halfDay} half day`);
  }
  return parts.join(", ");
}
