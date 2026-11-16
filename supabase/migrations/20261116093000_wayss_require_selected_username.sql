-- Do not expose auto-generated placeholder usernames before a person chooses their own.
drop policy if exists "profile lookup" on public.profiles;
create policy "profile lookup" on public.profiles for select to authenticated using (
 id=(select auth.uid()) or (
  deactivated_at is null and left(username,5)<>'user_'
  and not exists(select 1 from public.blocks b where (b.blocker_id=(select auth.uid()) and b.blocked_id=profiles.id) or (b.blocker_id=profiles.id and b.blocked_id=(select auth.uid())))
  and (not is_private or exists(select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.following_id=profiles.id and f.status='accepted'))
 )
);
drop policy if exists "visible posts" on public.posts;
create policy "visible posts" on public.posts for select to authenticated using (
 ((user_id=(select auth.uid())) or (
  visibility='public' and exists(select 1 from public.profiles p where p.id=posts.user_id and p.deactivated_at is null and left(p.username,5)<>'user_' and (not p.is_private or exists(select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.following_id=posts.user_id and f.status='accepted')))
 ))
 and not exists(select 1 from public.blocks b where (b.blocker_id=(select auth.uid()) and b.blocked_id=posts.user_id) or (b.blocker_id=posts.user_id and b.blocked_id=(select auth.uid())))
);
drop policy if exists "stories readable by owner or allowed audience" on public.stories;
create policy "stories readable by owner or allowed audience" on public.stories for select to authenticated using (
 user_id=(select auth.uid()) or (public.can_view_story(id) and exists(select 1 from public.profiles p where p.id=stories.user_id and p.deactivated_at is null and left(p.username,5)<>'user_'))
);
