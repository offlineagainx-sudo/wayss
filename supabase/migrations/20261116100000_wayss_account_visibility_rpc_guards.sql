-- Keep definer RPCs aligned with profile deactivation and required username onboarding.
create or replace function public.find_profile_exact(search_username text)
returns table(id uuid, username text, display_name text, avatar_url text, is_verified boolean, is_wayss_verified boolean, is_private boolean)
language sql stable security definer set search_path to ''
as $function$
  select p.id,p.username,p.display_name,p.avatar_url,p.is_verified,p.is_wayss_verified,p.is_private
  from public.profiles p
  where auth.uid() is not null
    and length(trim(both '@' from search_username)) >= 2
    and (lower(p.username) like lower(trim(both '@' from search_username)) || '%'
      or lower(coalesce(p.display_name,'')) like '%' || lower(trim(both '@' from search_username)) || '%')
    and p.id <> auth.uid()
    and p.deactivated_at is null
    and left(p.username,5) <> 'user_'
    and not exists (select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=auth.uid()))
  order by case when lower(p.username)=lower(trim(both '@' from search_username)) then 0
    when lower(p.username) like lower(trim(both '@' from search_username)) || '%' then 1 else 2 end, lower(p.username)
  limit 20;
$function$;

create or replace function public.follow_profile(target_id uuid)
returns text language plpgsql security definer set search_path to 'public'
as $function$
declare priv boolean;
begin
 if auth.uid() is null or auth.uid()=target_id then raise exception 'Not allowed'; end if;
 if exists(select 1 from public.blocks where (blocker_id=auth.uid() and blocked_id=target_id) or (blocker_id=target_id and blocked_id=auth.uid())) then raise exception 'Account unavailable'; end if;
 select is_private into priv from public.profiles where id=target_id and deactivated_at is null and left(username,5)<>'user_';
 if priv is null then raise exception 'Account not found'; end if;
 insert into public.follows(follower_id,following_id,status) values(auth.uid(),target_id,case when priv then 'pending' else 'accepted' end) on conflict do nothing;
 return case when priv then 'pending' else 'accepted' end;
end;
$function$;

create or replace function public.get_profile_connections(target_id uuid, connection_type text)
returns table(id uuid, username text, display_name text, avatar_url text)
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare viewer_id uuid := auth.uid();
declare target_private boolean;
begin
 if viewer_id is null then raise exception 'Authentication required'; end if;
 if connection_type not in ('followers','following') then raise exception 'Invalid connection type'; end if;
 select p.is_private into target_private from public.profiles p
 where p.id=target_id and p.deactivated_at is null and left(p.username,5)<>'user_';
 if not found then return; end if;
 if viewer_id <> target_id then
  if exists(select 1 from public.blocks b where (b.blocker_id=viewer_id and b.blocked_id=target_id) or (b.blocker_id=target_id and b.blocked_id=viewer_id)) then return; end if;
  if coalesce(target_private,false) and not exists(select 1 from public.follows own_follow where own_follow.follower_id=viewer_id and own_follow.following_id=target_id and own_follow.status='accepted') then return; end if;
 end if;
 if connection_type='followers' then
  return query select p.id,p.username,p.display_name,p.avatar_url
  from public.follows f join public.profiles p on p.id=f.follower_id
  where f.following_id=target_id and f.status='accepted'
   and p.deactivated_at is null and left(p.username,5)<>'user_'
   and not exists(select 1 from public.blocks b where (b.blocker_id=viewer_id and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=viewer_id))
  order by f.created_at desc;
 else
  return query select p.id,p.username,p.display_name,p.avatar_url
  from public.follows f join public.profiles p on p.id=f.following_id
  where f.follower_id=target_id and f.status='accepted'
   and p.deactivated_at is null and left(p.username,5)<>'user_'
   and not exists(select 1 from public.blocks b where (b.blocker_id=viewer_id and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=viewer_id))
  order by f.created_at desc;
 end if;
end;
$function$;
