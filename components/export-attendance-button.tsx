export function ExportAttendanceButton() {
  return (
    <a
      href="/api/admin/attendance-export"
      className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      Export Excel
    </a>
  );
}
