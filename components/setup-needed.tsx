export function SetupNeeded() {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm text-muted-foreground">Adsmagnify</p>
      <h1 className="font-heading mt-3 text-4xl font-semibold tracking-tight">
        Connect Supabase
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Add your project URL and anon (or publishable) key to{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">
          .env.local
        </code>
        , then run the SQL in{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">
          supabase/migrations/20260310000000_init.sql
        </code>{" "}
        in the Supabase SQL editor. See the README for the full setup.
      </p>
    </main>
  );
}
