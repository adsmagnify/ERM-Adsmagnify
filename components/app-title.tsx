"use client";

import { usePathname } from "next/navigation";

export function AppTitle({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  if (!isAdmin) {
    if (pathname.startsWith("/delay")) return "Delay";
    if (pathname.startsWith("/tasks")) return "Tasks";
    return "Clock & Tasks";
  }

  if (pathname.startsWith("/admin/people")) return "People";
  if (pathname.startsWith("/admin/delays")) return "Delay";
  if (pathname.startsWith("/tasks")) return "Tasks";
  return "Team";
}
