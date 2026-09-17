import { redirect } from "next/navigation";
import { LeaveRequestForm } from "@/components/leave-request-form";
import { LeaveStatusPill } from "@/components/leave-status-pill";
import type { LeaveRequest } from "@/lib/database.types";
import { requireProfile } from "@/lib/require-profile";
import { formatIstDateRange } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LeavesPage() {
  const { supabase, user, isAdmin } = await requireProfile();

  if (isAdmin) {
    redirect("/admin/leaves");
  }

  const { data: rows, error } = await supabase
    .from("leave_requests")
    .select("id, user_id, kind, from_date, to_date, reason, status, created_at")
    .eq("user_id", user.id)
    .order("from_date", { ascending: false });

  const leaves = error ? [] : ((rows ?? []) as LeaveRequest[]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <LeaveRequestForm />

      <section>
        <h2 className="font-heading text-lg font-semibold">Your requests</h2>
        {leaves.length === 0 ? (
          <p className="mt-5 rounded-[20px] border border-border bg-white px-5 py-8 text-sm text-muted-foreground">
            No leave requests yet.
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {leaves.map((row) => (
              <li
                key={row.id}
                className="rounded-[20px] border border-border bg-white px-5 py-5 sm:px-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-heading text-base font-medium">
                      {row.kind}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatIstDateRange(row.from_date, row.to_date)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {row.reason}
                    </p>
                  </div>
                  <LeaveStatusPill status={row.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
