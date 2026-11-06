begin;
alter table public.comments enable row level security;
revoke all on table public.comments from anon;
grant select,insert,update,delete on table public.comments to authenticated;
drop policy if exists "comments visible" on public.comments;
create policy "comments visible on accessible posts" on public.comments for select to authenticated
using (exists (select 1 from public.posts p where p.id=comments.post_id));
drop policy if exists "comment own" on public.comments;
create policy "comment on accessible post" on public.comments for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=comments.post_id));
drop policy if exists "comment owner update" on public.comments;
create policy "comment owner update" on public.comments for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "comment owner delete" on public.comments;
create policy "comment owner delete" on public.comments for delete to authenticated
using(user_id=(select auth.uid()));
create index if not exists comments_post_created_idx on public.comments(post_id,created_at);
do $$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='posts') then
  alter publication supabase_realtime add table public.posts;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='comments') then
  alter publication supabase_realtime add table public.comments;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='likes') then
  alter publication supabase_realtime add table public.likes;
 end if;
end $$;
commit;