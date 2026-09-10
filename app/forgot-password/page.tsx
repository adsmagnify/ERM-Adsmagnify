import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SetupNeeded } from "@/components/setup-needed";
import { getSupabaseEnv } from "@/lib/supabase/env";

type SearchParams = Promise<{ reset?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!getSupabaseEnv()) {
    return <SetupNeeded />;
  }

  const params = await searchParams;
  const resetting = params.reset === "1";

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <ForgotPasswordForm resetting={resetting} />
    </main>
  );
}
