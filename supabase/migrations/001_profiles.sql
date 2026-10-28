-- Run once in your Supabase project's SQL editor. No recordings are uploaded.
begin;
create table if not exists public.mimora_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 profile jsonb not null check (jsonb_typeof(profile) = 'object' and octet_length(profile::text) <= 10000),
 updated_at timestamptz not null default now()
);
create table if not exists public.mimora_sessions (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 500000),
 created_at timestamptz not null default now()
);
create index if not exists mimora_sessions_owner_created on public.mimora_sessions(user_id, created_at desc);
alter table public.mimora_profiles enable row level security;
alter table public.mimora_sessions enable row level security;
revoke all on public.mimora_profiles, public.mimora_sessions from anon;
grant select,insert,update,delete on public.mimora_profiles, public.mimora_sessions to authenticated;
drop policy if exists "Profile owner only" on public.mimora_profiles;
create policy "Profile owner only" on public.mimora_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Session owner only" on public.mimora_sessions;
create policy "Session owner only" on public.mimora_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
