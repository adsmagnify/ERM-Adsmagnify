import { AdminLeaveStatus } from "@/components/admin-leave-status";
import { LeaveBalanceTable } from "@/components/leave-balance-table";
import type { LeaveRequest, Profile } from "@/lib/database.types";
import { leaveTotalsFromProfile, leaveYear } from "@/lib/leave-balance";
import { formatIstDateRange } from "@/lib/time";

const statusRank = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
} as const;

export function AdminLeaves({
  people,
  leaves,
}: {
  people: Profile[];
  leaves: LeaveRequest[];
}) {
  const year = leaveYear();
  const employees = people
    .filter((person) => person.role === "employee")
    .sort((a, b) =>
      (a.full_name?.trim() || a.email || "").localeCompare(
        b.full_name?.trim() || b.email || ""
      )
    );

  const names = Object.fromEntries(
    people.map((person) => [
      person.id,
      person.full_name?.trim() || person.email || "Employee",
    ])
  );

  const rows = [...leaves].sort((a, b) => {
    const rank = statusRank[a.status] - statusRank[b.status];
    if (rank !== 0) return rank;
    return b.from_date.localeCompare(a.from_date);
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <section>
        <h2 className="font-heading text-xl font-medium">Leave requests</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve or reject casual and sick leave.
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-[20px] border border-border bg-white px-6 py-10 text-sm text-muted-foreground">
          No leave requests yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-[20px] border border-border bg-white px-5 py-5 sm:px-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-heading truncate text-lg font-medium">
                    {names[row.user_id] ?? "Employee"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.kind}
                    <span className="mx-2 text-border">·</span>
                    {formatIstDateRange(row.from_date, row.to_date)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {row.reason}
                  </p>
                </div>
                <AdminLeaveStatus leaveId={row.id} status={row.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="font-heading text-xl font-medium">
            Team leave balances · {year}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Total, used, pending, and remaining for each employee. Used updates
            when you approve a request.
          </p>
        </div>

        {employees.length === 0 ? (
          <p className="rounded-[20px] border border-border bg-white px-6 py-10 text-sm text-muted-foreground">
            No employees yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {employees.map((person) => {
              const name =
                person.full_name?.trim() || person.email || "Employee";
              const theirLeaves = leaves.filter(
                (row) => row.user_id === person.id
              );
              return (
                <LeaveBalanceTable
                  key={person.id}
                  leaves={theirLeaves}
                  totals={leaveTotalsFromProfile(person)}
                  title={`${name} · ${year}`}
                  description={
                    person.email
                      ? `${person.email}. Weekly offs are not counted.`
                      : "Weekly offs are not counted."
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
