import {
  RemoveEmployee,
  RoleSwitch,
} from "@/components/admin-team-actions";
import { CreateEmployeeForm } from "@/components/create-employee-form";
import { OfficeNetworkCard } from "@/components/office-network-card";
import type { Profile } from "@/lib/database.types";
import type { OfficeSettings } from "@/lib/office";
import {
  isDefaultSchedule,
  scheduleFromProfile,
  scheduleSummary,
} from "@/lib/schedule";

export function AdminPeople({
  people,
  currentUserId,
  office,
  currentIp,
}: {
  people: Profile[];
  currentUserId: string;
  office: OfficeSettings | null;
  currentIp: string | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <section>
        <h2 className="font-heading text-xl font-medium">Logins</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create accounts and set who is an admin. This is separate from today’s
          attendance.
        </p>
      </section>

      <CreateEmployeeForm />

      <OfficeNetworkCard office={office} currentIp={currentIp} />

      <section>
        <h2 className="font-heading text-xl font-medium">Everyone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {people.length} {people.length === 1 ? "person" : "people"}
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {people.map((person) => {
            const name =
              person.full_name?.trim() || person.email || "Employee";
            const schedule = scheduleFromProfile(person);
            return (
              <li
                key={person.id}
                className="rounded-[20px] border border-border bg-white px-5 py-5 sm:px-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-heading truncate text-lg font-medium">
                      {name}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {person.email}
                    </p>
                    {person.role === "employee" ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isDefaultSchedule(schedule)
                          ? "10:45 AM – 7:00 PM"
                          : scheduleSummary(schedule)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleSwitch
                      userId={person.id}
                      role={person.role}
                      isSelf={person.id === currentUserId}
                    />
                    {person.id !== currentUserId ? (
                      <RemoveEmployee userId={person.id} name={name} />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
