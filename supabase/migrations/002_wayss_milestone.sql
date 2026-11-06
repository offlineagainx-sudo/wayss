-- WAYSS milestone: secure messaging, uploads, notifications and admin controls
-- Apply only to the WAYSS Supabase project (hdxsukwljkwugcullpdn).

alter table public.messages add column if not exists media_url text;
alter table public.messages add column if not exists media_type text check (media_type is null or media_type in ('image','video'));
alter table public.messages alter column body drop not null;
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_or_media_check
  check ((coalesce(length(body),0) between 1 and 5000) or media_url is not null);

-- Never trust a client-side username/email flag for admin authorization.
create or replace function public.is_wayss_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and lower(coalesce(u.email,'')) = 'offlineagainx@gmail.com'
  );
$$;
revoke all on function public.is_wayss_admin() from public;
grant execute on function public.is_wayss_admin() to authenticated;

-- Reserve the @teamwayss username for the real admin account.
create or replace function public.new_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare u text;
begin
  u := lower(coalesce(new.raw_user_meta_data->>'username','user_'||substr(new.id::text,1,8)));
  if u !~ '^[a-z0-9_.]{3,24}$' or (u='teamwayss' and lower(coalesce(new.email,'')) <> 'offlineagainx@gmail.com') then
    u := 'user_'||substr(new.id::text,1,8);
  end if;
  insert into public.profiles(id,username,display_name,is_verified)
  values(new.id,u,coalesce(new.raw_user_meta_data->>'display_name',''),
    lower(coalesce(new.email,'')) = 'offlineagainx@gmail.com')
  on conflict(id) do nothing;
  return new;
end;
$$;

create or replace function public.review_verification(request_id uuid, decision text)
returns void language plpgsql security definer set search_path = ''
as $$
declare target uuid;
begin
  if not public.is_wayss_admin() or decision not in ('approved','rejected') then
    raise exception 'Only the WAYSS admin can review requests';
  end if;
  update public.verification_requests
  set status=decision, reviewed_by=auth.uid(), reviewed_at=now()
  where id=request_id and status='pending'
  returning user_id into target;
  if target is null then raise exception 'Pending request not found'; end if;
  update public.profiles set is_verified=(decision='approved') where id=target;
end;
$$;
revoke all on function public.review_verification(uuid,text) from public;
grant execute on function public.review_verification(uuid,text) to authenticated;

create or replace function public.open_conversation(target_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare cid uuid;
begin
  if auth.uid() is null or target_id=auth.uid() then raise exception 'Invalid conversation'; end if;
  if not exists(select 1 from public.profiles where id=target_id) then raise exception 'Account not found'; end if;
  if exists(select 1 from public.blocks b where
    (b.blocker_id=auth.uid() and b.blocked_id=target_id) or
    (b.blocker_id=target_id and b.blocked_id=auth.uid())) then raise exception 'Account unavailable'; end if;
  if exists(select 1 from public.profiles p where p.id=target_id and p.is_private)
     and not exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=target_id and f.status='accepted') then
    raise exception 'Follow approval required before messaging';
  end if;
  select c.id into cid
  from public.conversations c
  join public.conversation_members a on a.conversation_id=c.id and a.user_id=auth.uid()
  join public.conversation_members b on b.conversation_id=c.id and b.user_id=target_id
  where (select count(*) from public.conversation_members m where m.conversation_id=c.id)=2
  limit 1;
  if cid is null then
    insert into public.conversations default values returning id into cid;
    insert into public.conversation_members(conversation_id,user_id)
    values(cid,auth.uid()),(cid,target_id);
  end if;
  return cid;
end;
$$;
revoke all on function public.open_conversation(uuid) from public;
grant execute on function public.open_conversation(uuid) to authenticated;

-- Media uploads are private to the uploader; access to post/chat media is governed by app records.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('wayss-media','wayss-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "WAYSS upload own media" on storage.objects;
create policy "WAYSS upload own media" on storage.objects for insert to authenticated
with check (bucket_id='wayss-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "WAYSS read own media" on storage.objects;
create policy "WAYSS read own media" on storage.objects for select to authenticated
using (bucket_id='wayss-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "WAYSS delete own media" on storage.objects;
create policy "WAYSS delete own media" on storage.objects for delete to authenticated
using (bucket_id='wayss-media' and (storage.foldername(name))[1]=auth.uid()::text);

-- Admin can review all verification requests; users can only read their own.
drop policy if exists "verification owner read" on public.verification_requests;
create policy "verification owner or admin read" on public.verification_requests
for select to authenticated using(user_id=auth.uid() or public.is_wayss_admin());
drop policy if exists "verification own request" on public.verification_requests;
create policy "verification own request" on public.verification_requests
for insert to authenticated with check(user_id=auth.uid());

-- Realtime publication additions are safe to rerun.
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;


-- Allow authenticated viewers to read media only when its owning post/chat is visible to them.
drop policy if exists "WAYSS read own media" on storage.objects;
create policy "WAYSS read visible media" on storage.objects for select to authenticated
using (
  bucket_id='wayss-media' and (
    (storage.foldername(name))[1]=auth.uid()::text
    or exists (
      select 1 from public.posts p
      join public.profiles owner on owner.id=p.user_id
      where p.media_url=name
        and not exists(select 1 from public.blocks b where
          (b.blocker_id=auth.uid() and b.blocked_id=p.user_id) or
          (b.blocker_id=p.user_id and b.blocked_id=auth.uid()))
        and (
          p.user_id=auth.uid()
          or (p.visibility='public' and not owner.is_private)
          or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.user_id and f.status='accepted')
        )
    )
    or exists (
      select 1 from public.messages m
      where m.media_url=name and public.is_conversation_member(m.conversation_id)
    )
  )
);

-- Notifications are generated from actual database events, never fabricated by the client.
create or replace function public.wayss_notify_event()
returns trigger language plpgsql security definer set search_path=''
as $$
declare recipient uuid; actor uuid; kind_value text; entity uuid;
begin
  actor := auth.uid();
  if tg_table_name='likes' then
    select user_id into recipient from public.posts where id=new.post_id;
    kind_value := 'liked your post'; entity := new.post_id;
  elsif tg_table_name='follows' then
    recipient := new.following_id; kind_value := case when new.status='pending' then 'requested to follow you' else 'started following you' end; entity := new.following_id;
  elsif tg_table_name='comments' then
    select user_id into recipient from public.posts where id=new.post_id;
    kind_value := 'commented on your post'; entity := new.post_id;
  elsif tg_table_name='messages' then
    select cm.user_id into recipient from public.conversation_members cm
    where cm.conversation_id=new.conversation_id and cm.user_id<>new.sender_id limit 1;
    actor := new.sender_id; kind_value := 'sent you a message'; entity := new.conversation_id;
  end if;
  if recipient is not null and actor is not null and recipient<>actor then
    insert into public.notifications(recipient_id,actor_id,kind,entity_id)
    values(recipient,actor,kind_value,entity);
  end if;
  return new;
end;
$$;

drop trigger if exists wayss_like_notification on public.likes;
create trigger wayss_like_notification after insert on public.likes
for each row execute function public.wayss_notify_event();
drop trigger if exists wayss_follow_notification on public.follows;
create trigger wayss_follow_notification after insert on public.follows
for each row execute function public.wayss_notify_event();
drop trigger if exists wayss_comment_notification on public.comments;
create trigger wayss_comment_notification after insert on public.comments
for each row execute function public.wayss_notify_event();
drop trigger if exists wayss_message_notification on public.messages;
create trigger wayss_message_notification after insert on public.messages
for each row execute function public.wayss_notify_event();
