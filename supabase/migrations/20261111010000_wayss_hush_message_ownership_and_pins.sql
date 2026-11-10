-- WAYSS HUSH hardening: sender-owned edits/unsends and per-message pins.
create or replace function public.edit_dm_message(p_message_id uuid, p_body text)
returns void language plpgsql security definer set search_path = ''
as $function$
declare v_message public.messages%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_body is null or length(btrim(p_body)) not between 1 and 5000 then raise exception 'Message must contain 1–5000 characters'; end if;
 select * into v_message from public.messages where id=p_message_id for update;
 if not found or v_message.sender_id <> auth.uid() then raise exception 'Message not found or not yours'; end if;
 if v_message.deleted_at is not null or v_message.message_type <> 'text' then raise exception 'Only active text messages can be edited'; end if;
 if v_message.created_at < now() - interval '15 minutes' then raise exception 'The edit window has expired'; end if;
 if not exists(select 1 from public.conversation_members cm where cm.conversation_id=v_message.conversation_id and cm.user_id=auth.uid() and cm.request_status='accepted') then raise exception 'Conversation is not accessible'; end if;
 update public.messages set body=btrim(p_body),edited_at=now() where id=p_message_id and sender_id=auth.uid();
end;$function$;
create or replace function public.unsend_dm_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = ''
as $function$
declare v_message public.messages%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into v_message from public.messages where id=p_message_id for update;
 if not found or v_message.sender_id <> auth.uid() then raise exception 'Message not found or not yours'; end if;
 if v_message.deleted_at is not null then return; end if;
 if not exists(select 1 from public.conversation_members cm where cm.conversation_id=v_message.conversation_id and cm.user_id=auth.uid() and cm.request_status='accepted') then raise exception 'Conversation is not accessible'; end if;
 update public.messages set body='Message unsent',media_url=null,media_type=null,message_type='system',deleted_at=now(),edited_at=null where id=p_message_id and sender_id=auth.uid();
end;$function$;
create table if not exists public.pinned_messages(conversation_id uuid not null references public.conversations(id) on delete cascade,message_id uuid not null references public.messages(id) on delete cascade,pinned_by uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(conversation_id,message_id));
alter table public.pinned_messages enable row level security;
drop policy if exists "conversation members read pinned messages" on public.pinned_messages;
create policy "conversation members read pinned messages" on public.pinned_messages for select to authenticated using(public.is_conversation_member(conversation_id));
drop policy if exists "members pin messages" on public.pinned_messages;
create policy "members pin messages" on public.pinned_messages for insert to authenticated with check(pinned_by=(select auth.uid()) and public.is_conversation_member(conversation_id) and exists(select 1 from public.messages m where m.id=message_id and m.conversation_id=pinned_messages.conversation_id and m.deleted_at is null));
drop policy if exists "members unpin messages" on public.pinned_messages;
create policy "members unpin messages" on public.pinned_messages for delete to authenticated using(public.is_conversation_member(conversation_id) and pinned_by=(select auth.uid()));
grant select,insert,delete on public.pinned_messages to authenticated;
revoke update on public.messages from authenticated;
revoke all on function public.edit_dm_message(uuid,text) from public,anon;
revoke all on function public.unsend_dm_message(uuid) from public,anon;
grant execute on function public.edit_dm_message(uuid,text) to authenticated;
grant execute on function public.unsend_dm_message(uuid) to authenticated;
