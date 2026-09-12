import type { DelayNotice, Profile } from "@/lib/database.types";
import { formatIstDate, formatIstTime } from "@/lib/time";

export function AdminDelays({
  people,
  delays,
}: {
  people: Profile[];
  delays: DelayNotice[];
}) {
  const names = Object.fromEntries(
    people.map((person) => [
      person.id,
      person.full_name?.trim() || person.email || "Employee",
    ])
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <section>
        <h2 className="font-heading text-xl font-medium">Delay forms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Late emails sent today, with ETA and reason.
        </p>
      </section>

      {delays.length === 0 ? (
        <p className="rounded-[20px] border border-border bg-white px-6 py-10 text-sm text-muted-foreground">
          No delay forms yet today.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {delays.map((row) => (
            <li
              key={row.id}
              className="rounded-[20px] border border-border bg-white px-5 py-5 sm:px-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-heading truncate text-lg font-medium">
                    {names[row.user_id] ?? "Employee"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatIstDate(row.work_date)}
                    <span className="mx-2 text-border">·</span>
                    ETA {formatIstTime(row.eta)}
                  </p>
                  <p className="mt-3 text-sm font-medium">{row.reason}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {row.message}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
