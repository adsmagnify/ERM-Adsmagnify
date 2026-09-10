import { AppHeader } from "@/components/app-header";
import { SetupNeeded } from "@/components/setup-needed";
import { requireProfile } from "@/lib/require-profile";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!getSupabaseEnv()) {
    return <SetupNeeded />;
  }

  const { user, profile, isAdmin } = await requireProfile();

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader
        name={profile?.full_name}
        email={profile?.email ?? user.email}
        isAdmin={isAdmin}
      />
      {children}
    </div>
  );
}
