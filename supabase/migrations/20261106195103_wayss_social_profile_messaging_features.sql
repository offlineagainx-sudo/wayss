-- Additive WAYSS social, profile, privacy and messaging features.
alter table public.profiles add column if not exists is_wayss_verified boolean not null default false, add column if not exists identity_line text not null default '', add column if not exists updated_at timestamptz not null default now();
alter table public.posts add column if not exists post_type text not null default 'post' check (post_type in ('post','flux'));
alter table public.conversations add column if not exists kind text not null default 'direct' check (kind in ('direct','group')), add column if not exists group_name text, add column if not exists group_avatar_url text, add column if not exists created_by uuid references public.profiles(id);
alter table public.conversation_members add column if not exists role text not null default 'member' check (role in ('member','admin')), add column if not exists request_status text not null default 'accepted' check (request_status in ('pending','accepted','hidden')), add column if not exists starred boolean not null default false, add column if not exists muted_until timestamptz;
alter table public.messages add column if not exists edited_at timestamptz, add column if not exists deleted_at timestamptz, add column if not exists reply_to_id uuid references public.messages(id), add column if not exists forwarded_from_id uuid references public.messages(id), add column if not exists message_type text not null default 'text' check (message_type in ('text','image','video','audio','file','voice','system'));

create table if not exists public.saved_posts(user_id uuid not null references public.profiles(id) on delete cascade,post_id uuid not null references public.posts(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,post_id));
alter table public.saved_posts enable row level security;
create policy "saved posts owner read" on public.saved_posts for select to authenticated using(user_id=(select auth.uid()));
create policy "saved posts owner insert" on public.saved_posts for insert to authenticated with check(user_id=(select auth.uid()));
create policy "saved posts owner delete" on public.saved_posts for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,delete on public.saved_posts to authenticated;

create table if not exists public.profile_sections(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,title text not null check(length(title) between 1 and 60),description text not null default '' check(length(description)<=3000),accent_color text not null default '#F32950' check(accent_color ~ '^#[0-9A-Fa-f]{6}$'),sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.profile_sections enable row level security;
create policy "profile sections visible" on public.profile_sections for select to authenticated using(user_id=(select auth.uid()) or (not exists(select 1 from public.blocks b where (b.blocker_id=(select auth.uid()) and b.blocked_id=profile_sections.user_id) or (b.blocker_id=profile_sections.user_id and b.blocked_id=(select auth.uid()))) and (exists(select 1 from public.profiles p where p.id=profile_sections.user_id and not p.is_private) or exists(select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.following_id=profile_sections.user_id and f.status='accepted'))));
create policy "profile sections owner insert" on public.profile_sections for insert to authenticated with check(user_id=(select auth.uid()));
create policy "profile sections owner update" on public.profile_sections for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "profile sections owner delete" on public.profile_sections for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,update,delete on public.profile_sections to authenticated;

create table if not exists public.profile_links(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,section_id uuid references public.profile_sections(id) on delete cascade,title text not null check(length(title) between 1 and 60),url text not null check(length(url)<=2048 and url ~* '^https?://'),sort_order integer not null default 0,created_at timestamptz not null default now());
alter table public.profile_links enable row level security;
create policy "profile links visible" on public.profile_links for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.profile_sections s where s.id=profile_links.section_id));
create policy "profile links owner insert" on public.profile_links for insert to authenticated with check(user_id=(select auth.uid()) and (section_id is null or exists(select 1 from public.profile_sections s where s.id=profile_links.section_id and s.user_id=(select auth.uid()))));
create policy "profile links owner update" on public.profile_links for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "profile links owner delete" on public.profile_links for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,update,delete on public.profile_links to authenticated;

create table if not exists public.user_settings(user_id uuid primary key references public.profiles(id) on delete cascade,read_receipts boolean not null default true,activity_status boolean not null default true,push_notifications boolean not null default true,message_notifications boolean not null default true,notification_sound boolean not null default true,theme text not null default 'dark' check(theme in ('dark','system')),updated_at timestamptz not null default now());
alter table public.user_settings enable row level security;
create policy "settings owner all" on public.user_settings for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.user_settings to authenticated;

create table if not exists public.restrictions(restrictor_id uuid not null references public.profiles(id) on delete cascade,restricted_id uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(restrictor_id,restricted_id),check(restrictor_id<>restricted_id));
alter table public.restrictions enable row level security;
create policy "restrictions owner all" on public.restrictions for all to authenticated using(restrictor_id=(select auth.uid())) with check(restrictor_id=(select auth.uid()));
grant select,insert,delete on public.restrictions to authenticated;

create table if not exists public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles(id) on delete cascade,target_user_id uuid not null references public.profiles(id) on delete cascade,post_id uuid references public.posts(id) on delete set null,reason text not null check(length(reason) between 3 and 80),details text not null default '' check(length(details)<=2000),status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),created_at timestamptz not null default now(),check(reporter_id<>target_user_id));
alter table public.reports enable row level security;
create policy "reports create own" on public.reports for insert to authenticated with check(reporter_id=(select auth.uid()));
create policy "reports reporter read" on public.reports for select to authenticated using(reporter_id=(select auth.uid()) or public.is_wayss_admin());
grant select,insert on public.reports to authenticated;

create table if not exists public.message_reactions(message_id uuid not null references public.messages(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,emoji text not null check(length(emoji) between 1 and 16),created_at timestamptz not null default now(),primary key(message_id,user_id,emoji));
alter table public.message_reactions enable row level security;
create policy "message reactions member read" on public.message_reactions for select to authenticated using(exists(select 1 from public.messages m where m.id=message_reactions.message_id and public.is_conversation_member(m.conversation_id)));
create policy "message reactions own insert" on public.message_reactions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.messages m where m.id=message_reactions.message_id and public.is_conversation_member(m.conversation_id)));
create policy "message reactions own delete" on public.message_reactions for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,delete on public.message_reactions to authenticated;

create index if not exists profile_sections_user_order_idx on public.profile_sections(user_id,sort_order);
create index if not exists profile_links_user_order_idx on public.profile_links(user_id,sort_order);
create index if not exists saved_posts_created_idx on public.saved_posts(user_id,created_at desc);
create index if not exists message_reactions_message_idx on public.message_reactions(message_id);
create index if not exists reports_status_created_idx on public.reports(status,created_at desc);
create index if not exists follows_pending_idx on public.follows(following_id,created_at desc) where status='pending';

revoke update on public.profiles from authenticated;
grant update(username,display_name,bio,avatar_url,cover_url,is_private,identity_line,updated_at) on public.profiles to authenticated;
drop policy if exists "sender edits own messages" on public.messages;
create policy "sender edits own messages" on public.messages for update to authenticated using(sender_id=(select auth.uid()) and public.is_conversation_member(conversation_id)) with check(sender_id=(select auth.uid()) and public.is_conversation_member(conversation_id));
grant update on public.messages to authenticated;
