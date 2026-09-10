import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { AppNav } from "@/components/app-nav";
import { AppTitle } from "@/components/app-title";

type AppHeaderProps = {
  name?: string | null;
  email?: string | null;
  isAdmin?: boolean;
};

export function AppHeader({ name, email, isAdmin = false }: AppHeaderProps) {
  const label = name?.trim() || email || "You";

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-2 pt-8 sm:px-10 lg:px-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Adsmagnify</p>
          <h1 className="font-heading mt-1 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            <AppTitle isAdmin={isAdmin} />
          </h1>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="max-w-[14rem] truncate text-sm text-muted-foreground sm:text-right">
            {label}
            {isAdmin ? " · Admin" : ""}
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </form>
        </div>
      </div>
      <AppNav isAdmin={isAdmin} />
    </header>
  );
}
