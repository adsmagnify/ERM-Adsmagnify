export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10">
      <div className="mx-auto h-5 w-48 animate-pulse rounded-full bg-muted" />
      <div className="mx-auto mt-6 h-20 w-64 animate-pulse rounded-3xl bg-muted sm:h-28 sm:w-96" />
      <div className="mx-auto mt-10 h-8 w-28 animate-pulse rounded-full bg-muted" />
      <div className="mt-12 grid grid-cols-2 gap-4">
        <div className="h-44 animate-pulse rounded-[20px] bg-muted" />
        <div className="h-44 animate-pulse rounded-[20px] bg-muted" />
      </div>
    </div>
  );
}
