import { LoginForm } from "@/components/login-form";
import { SetupNeeded } from "@/components/setup-needed";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  if (!getSupabaseEnv()) {
    return <SetupNeeded />;
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <LoginForm />
    </main>
  );
}
