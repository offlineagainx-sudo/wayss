begin;
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists edited_at timestamptz;
create index if not exists comments_parent_created_idx on public.comments(parent_id,created_at);
create table if not exists public.comment_likes(
 comment_id uuid not null references public.comments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(comment_id,user_id)
);
alter table public.comment_likes enable row level security;
revoke all on table public.comment_likes from anon;
grant select,insert,delete on table public.comment_likes to authenticated;
drop policy if exists "comment likes visible" on public.comment_likes;
create policy "comment likes visible" on public.comment_likes for select to authenticated
using(exists(select 1 from public.comments c where c.id=comment_likes.comment_id));
drop policy if exists "comment likes own insert" on public.comment_likes;
create policy "comment likes own insert" on public.comment_likes for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.comments c where c.id=comment_likes.comment_id));
drop policy if exists "comment likes own delete" on public.comment_likes;
create policy "comment likes own delete" on public.comment_likes for delete to authenticated
using(user_id=(select auth.uid()));
do $$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='comment_likes') then
  alter publication supabase_realtime add table public.comment_likes;
 end if;
end $$;
commit;