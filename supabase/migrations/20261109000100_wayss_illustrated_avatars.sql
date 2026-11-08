alter table public.profiles add column if not exists avatar_config jsonb;
grant update(avatar_config) on public.profiles to authenticated;
