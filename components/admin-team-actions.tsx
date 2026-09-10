"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteEmployee } from "@/app/actions/employees";
import { setProfileRole } from "@/app/actions/roles";
import type { UserRole } from "@/lib/database.types";

export function RoleSwitch({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(next: UserRole) {
    if (next === role) return;
    startTransition(async () => {
      const result = await setProfileRole(userId, next);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Role
      <select
        value={role}
        disabled={pending}
        aria-label={isSelf ? "Your role" : "Employee role"}
        onChange={(event) => onChange(event.target.value as UserRole)}
        className="h-10 cursor-pointer rounded-2xl border border-border bg-transparent px-3 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        <option value="employee">Employee</option>
        <option value="admin">Admin</option>
      </select>
    </label>
  );
}

export function RemoveEmployee({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  function onRemove() {
    const confirmed = window.confirm(
      `Remove ${name}? They will not be able to sign in.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteEmployee(userId);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={pending}
      className="h-10 cursor-pointer rounded-2xl px-3 text-sm text-[#b5432f] transition-colors hover:bg-[#f8ece9] disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
