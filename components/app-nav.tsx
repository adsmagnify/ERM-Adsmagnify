"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex w-full overflow-x-auto rounded-[20px] border border-border bg-white p-1.5"
    >
      {isAdmin ? (
        <>
          <Tab href="/admin" active={pathname === "/admin"}>
            Team
          </Tab>
          <Tab
            href="/admin/delays"
            active={pathname.startsWith("/admin/delays")}
          >
            Delay
          </Tab>
          <Tab href="/tasks" active={pathname.startsWith("/tasks")}>
            Tasks
          </Tab>
          <Tab
            href="/admin/leaves"
            active={pathname.startsWith("/admin/leaves")}
          >
            Leave
          </Tab>
          <Tab
            href="/admin/people"
            active={pathname.startsWith("/admin/people")}
          >
            People
          </Tab>
        </>
      ) : (
        <>
          <Tab href="/" active={pathname === "/"}>
            Clock
          </Tab>
          <Tab href="/delay" active={pathname.startsWith("/delay")}>
            Delay
          </Tab>
          <Tab href="/tasks" active={pathname.startsWith("/tasks")}>
            Tasks
          </Tab>
          <Tab href="/leaves" active={pathname.startsWith("/leaves")}>
            Leave
          </Tab>
        </>
      )}
    </nav>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex h-12 flex-1 items-center justify-center rounded-2xl px-1 text-sm font-medium transition-colors sm:text-base",
        active
          ? "bg-foreground text-white"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
