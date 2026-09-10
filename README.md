# Adsmagnify Clock & Tasks

Internal web app with daily clock in / clock out, a personal task board, and an admin team view.

## Roles

- **Employee** — own clock in / clock out and own tasks.
- **Admin** — Team view: create employee logins, everyone’s attendance and tasks, and roles.

The first profile in the database is promoted to admin (the account you just created). Later signups are employees unless an admin changes their role.

If you already ran the first SQL file, also run [`supabase/migrations/20260310000001_roles.sql`](supabase/migrations/20260310000001_roles.sql). To promote someone manually:

```sql
update public.profiles
set role = 'admin'
where email = 'you@company.com';
```

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Row Level Security)
- Timezone: `Asia/Kolkata` (IST). Times are stored as `timestamptz` (UTC) and shown in IST.

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_or_publishable_key
NEXT_PUBLIC_SITE_URL=http://localhost:3002
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
```

You can use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` instead of the anon key (newer Supabase projects).

`NEXT_PUBLIC_SITE_URL` is used for password-reset redirects. On Vercel, set it to your production URL (for example `https://your-app.vercel.app`).

`SUPABASE_SERVICE_ROLE_KEY` is required so admins can create employee accounts. Copy **service_role** from Supabase → Project Settings → API. Never put this key in a `NEXT_PUBLIC_` variable.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run:
   - [`supabase/migrations/20260310000000_init.sql`](supabase/migrations/20260310000000_init.sql)
   - [`supabase/migrations/20260310000001_roles.sql`](supabase/migrations/20260310000001_roles.sql)
   
   That creates tables, RLS, the profile trigger, attendance rules, and admin/employee roles.
3. **Authentication → Providers → Email**: enable email + password.
4. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (and your Vercel URL in production)
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://YOUR_DOMAIN/auth/callback`
5. Admins create employees from the **Team** page (name, email, password). Employees only sign in — there is no public signup.

If users already existed before the trigger was added:

```sql
insert into public.profiles (id, full_name, email)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  email
from auth.users
on conflict (id) do nothing;
```

## Attendance rules (computed in Postgres)

- One clock in and one clock out per user per IST day.
- Clock in after **10:45 AM IST** → **Half day** (`Late arrival`), even if they stay late.
- Clocked in on time, clock out before **7:00 PM IST** → **Half day** (`Left early`).
- Clocked in by 10:45 AM and clocked out at or after 7:00 PM → **Full day**.
- Before clock out, the UI shows **In progress** with “Clock out after 7:00 PM for a full day”.
- Clients cannot set times or status. A trigger forces `now()` and writes status only after clock out.

`status_reason` is stored on finished days so the Full/Half reason is not recomputed on the client.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Routes:

- `/login` — sign in / create account
- `/forgot-password` — request reset, then set a new password after the email link
- `/` — clock
- `/tasks` — task board
- `/admin` — team view (admins only)

## Deploy to Vercel

1. Push this repo and import it in Vercel.
2. Add the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` or publishable key, `NEXT_PUBLIC_SITE_URL`).
3. Deploy.
4. Add the production URL to Supabase Site URL and Redirect URLs (`https://YOUR_DOMAIN/auth/callback`).
