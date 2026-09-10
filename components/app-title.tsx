"use client";

import { usePathname } from "next/navigation";

export function AppTitle({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  if (!isAdmin) return "Clock & Tasks";
  if (pathname.startsWith("/admin/people")) return "People";
  if (pathname.startsWith("/tasks")) return "Tasks";
  return "Team";
}
