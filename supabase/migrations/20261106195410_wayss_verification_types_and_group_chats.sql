alter table public.verification_requests add column if not exists verification_type text not null default 'normal' check(verification_type in ('normal','wayss'));
create or replace function public.review_verification(request_id uuid,decision text) returns void language plpgsql security definer set search_path='' as $function$
declare target uuid; badge_type text;
begin
 if not public.is_wayss_admin() or decision not in ('approved','rejected') then raise exception 'Only the WAYSS admin can review requests'; end if;
 update public.verification_requests set status=decision,reviewed_by=auth.uid(),reviewed_at=now() where id=request_id and status='pending' returning user_id,verification_type into target,badge_type;
 if target is null then raise exception 'Pending request not found'; end if;
 if decision='approved' then if badge_type='wayss' then update public.profiles set is_wayss_verified=true where id=target; else update public.profiles set is_verified=true where id=target; end if; end if;
end;$function$;
create or replace function public.set_profile_verification(target_id uuid,badge_type text,enabled boolean) returns void language plpgsql security definer set search_path='' as $function$
begin
 if not public.is_wayss_admin() then raise exception 'Only the WAYSS admin can manage verification'; end if;
 if badge_type='wayss' then update public.profiles set is_wayss_verified=enabled where id=target_id;
 elsif badge_type='normal' then update public.profiles set is_verified=enabled where id=target_id;
 else raise exception 'Invalid verification type'; end if;
 if not found then raise exception 'Profile not found'; end if;
end;$function$;
revoke all on function public.set_profile_verification(uuid,text,boolean) from public,anon;
grant execute on function public.set_profile_verification(uuid,text,boolean) to authenticated;
drop policy if exists "member add self" on public.conversation_members;
drop policy if exists "member leave or admin remove" on public.conversation_members;
create policy "member leave or admin remove" on public.conversation_members for delete to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.conversations c join public.conversation_members m on m.conversation_id=c.id where c.id=conversation_members.conversation_id and c.kind='group' and m.user_id=(select auth.uid()) and m.role='admin'));
grant delete on public.conversation_members to authenticated;
create or replace function public.create_group_conversation(group_name text,member_ids uuid[]) returns uuid language plpgsql security definer set search_path='' as $function$
declare cid uuid; member_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if length(trim(group_name)) not between 1 and 60 then raise exception 'Group name must be 1–60 characters'; end if;
 if member_ids is null or cardinality(member_ids) not between 2 and 49 then raise exception 'Choose 2–49 other members'; end if;
 if exists(select 1 from unnest(member_ids) x where x=auth.uid()) then raise exception 'Do not include yourself'; end if;
 if exists(select 1 from unnest(member_ids) x where not exists(select 1 from public.profiles p where p.id=x)) then raise exception 'A selected account does not exist'; end if;
 if exists(select 1 from unnest(member_ids) x join public.blocks b on (b.blocker_id=auth.uid() and b.blocked_id=x) or (b.blocker_id=x and b.blocked_id=auth.uid())) then raise exception 'A selected account is unavailable'; end if;
 insert into public.conversations(kind,group_name,created_by) values('group',trim(group_name),auth.uid()) returning id into cid;
 insert into public.conversation_members(conversation_id,user_id,role,request_status) values(cid,auth.uid(),'admin','accepted');
 foreach member_id in array member_ids loop insert into public.conversation_members(conversation_id,user_id,role,request_status) values(cid,member_id,'member','accepted'); end loop;
 return cid;
end;$function$;
create or replace function public.add_group_member(cid uuid,target_id uuid) returns void language plpgsql security definer set search_path='' as $function$
begin
 if auth.uid() is null or not exists(select 1 from public.conversations c join public.conversation_members m on m.conversation_id=c.id where c.id=cid and c.kind='group' and m.user_id=auth.uid() and m.role='admin') then raise exception 'Group admin permission required'; end if;
 if exists(select 1 from public.blocks where (blocker_id=auth.uid() and blocked_id=target_id) or (blocker_id=target_id and blocked_id=auth.uid())) then raise exception 'Account unavailable'; end if;
 insert into public.conversation_members(conversation_id,user_id,role,request_status) values(cid,target_id,'member','accepted') on conflict do nothing;
end;$function$;
revoke all on function public.create_group_conversation(text,uuid[]) from public,anon;
revoke all on function public.add_group_member(uuid,uuid) from public,anon;
grant execute on function public.create_group_conversation(text,uuid[]) to authenticated;
grant execute on function public.add_group_member(uuid,uuid) to authenticated;
