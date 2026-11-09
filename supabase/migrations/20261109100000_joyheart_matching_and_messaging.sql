-- JoyHeart matching and private messaging foundation.
-- Apply only after explicit production migration approval.
-- All interaction and message access is enforced by PostgreSQL RLS and RPCs.

create table if not exists public.profile_interactions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('like', 'pass')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_interactions_no_self check (actor_id <> target_id),
  constraint profile_interactions_pair_unique unique (actor_id, target_id)
);

create index if not exists profile_interactions_target_action_idx
  on public.profile_interactions(target_id, action);

create table if not exists public.profile_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_blocks_no_self check (blocker_id <> blocked_id),
  constraint profile_blocks_pair_unique unique (blocker_id, blocked_id)
);

create table if not exists public.profile_matches (
  id uuid primary key default gen_random_uuid(),
  member_low uuid not null references auth.users(id) on delete cascade,
  member_high uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'unmatched', 'blocked')),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint profile_matches_ordered_pair check (member_low < member_high),
  constraint profile_matches_pair_unique unique (member_low, member_high)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.profile_matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc);
create index if not exists conversations_last_message_idx
  on public.conversations(last_message_at desc nulls last);

create table if not exists public.member_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint member_reports_no_self check (reporter_id <> reported_id)
);

create index if not exists member_reports_status_created_idx
  on public.member_reports(status, created_at);

alter table public.profile_interactions enable row level security;
alter table public.profile_blocks enable row level security;
alter table public.profile_matches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.member_reports enable row level security;

-- Interactions are private: members can inspect only their own outgoing likes/passes.
drop policy if exists "members read own interactions" on public.profile_interactions;
create policy "members read own interactions"
on public.profile_interactions for select to authenticated
using (actor_id = (select auth.uid()));

-- Block lists are private to the blocker.
drop policy if exists "members read own blocks" on public.profile_blocks;
create policy "members read own blocks"
on public.profile_blocks for select to authenticated
using (blocker_id = (select auth.uid()));

-- Matches and conversations are visible only to their participants.
drop policy if exists "match participants read matches" on public.profile_matches;
create policy "match participants read matches"
on public.profile_matches for select to authenticated
using ((select auth.uid()) in (member_low, member_high));

drop policy if exists "conversation participants read conversations" on public.conversations;
create policy "conversation participants read conversations"
on public.conversations for select to authenticated
using (exists (
  select 1 from public.profile_matches m
  where m.id = conversations.match_id
    and m.status = 'active'
    and (select auth.uid()) in (m.member_low, m.member_high)
));

drop policy if exists "conversation participants read messages" on public.messages;
create policy "conversation participants read messages"
on public.messages for select to authenticated
using (exists (
  select 1
  from public.conversations c
  join public.profile_matches m on m.id = c.match_id
  where c.id = messages.conversation_id
    and m.status = 'active'
    and (select auth.uid()) in (m.member_low, m.member_high)
    and not exists (
      select 1 from public.profile_blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = case
        when m.member_low = (select auth.uid()) then m.member_high else m.member_low end)
         or (b.blocker_id = case
        when m.member_low = (select auth.uid()) then m.member_high else m.member_low end
        and b.blocked_id = (select auth.uid()))
    )
));

drop policy if exists "members read own reports" on public.member_reports;
create policy "members read own reports"
on public.member_reports for select to authenticated
using (reporter_id = (select auth.uid()));

-- No direct client writes to interactions, matches, conversations, or reports.
revoke all on public.profile_interactions, public.profile_matches, public.conversations, public.member_reports from anon, authenticated;
grant select on public.profile_interactions, public.profile_matches, public.conversations to authenticated;
grant select on public.member_reports to authenticated;
grant select on public.messages to authenticated;

create or replace function public.joyheart_record_interaction(p_target_id uuid, p_action text)
returns table (interaction_id uuid, match_id uuid, matched boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_match_id uuid;
  v_interaction_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_action not in ('like', 'pass') then raise exception 'Invalid action'; end if;
  if p_target_id is null or p_target_id = v_actor then raise exception 'Invalid target'; end if;

  if exists (
    select 1 from public.profile_blocks b
    where (b.blocker_id = v_actor and b.blocked_id = p_target_id)
       or (b.blocker_id = p_target_id and b.blocked_id = v_actor)
  ) then raise exception 'This profile is unavailable'; end if;

  if not exists (
    select 1 from public.profiles p
    where p.user_id = p_target_id and p.publication_status = 'published'
  ) then raise exception 'This profile is unavailable'; end if;

  if not exists (
    select 1 from public.profiles p
    where p.user_id = v_actor and p.publication_status = 'published'
  ) then raise exception 'Complete and publish your profile before interacting'; end if;

  insert into public.profile_interactions(actor_id, target_id, action)
  values (v_actor, p_target_id, p_action)
  on conflict (actor_id, target_id)
  do update set action = excluded.action, updated_at = now()
  returning id into v_interaction_id;

  if p_action = 'like' and exists (
    select 1 from public.profile_interactions i
    where i.actor_id = p_target_id and i.target_id = v_actor and i.action = 'like'
  ) then
    v_low := least(v_actor, p_target_id);
    v_high := greatest(v_actor, p_target_id);
    insert into public.profile_matches(member_low, member_high)
    values (v_low, v_high)
    on conflict (member_low, member_high)
    do update set status = 'active', ended_at = null
    returning id into v_match_id;

    insert into public.conversations(match_id)
    values (v_match_id)
    on conflict (match_id) do nothing;
  end if;

  return query select v_interaction_id, v_match_id, v_match_id is not null;
end;
$$;

create or replace function public.joyheart_send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_message_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then
    raise exception 'Message must be between 1 and 4000 characters';
  end if;

  -- Limit message bursts to reduce spam and abusive automation.
  if (select count(*) from public.messages msg
      where msg.sender_id = v_actor
        and msg.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Message rate limit reached. Please wait before sending more.';
  end if;

  if not exists (
    select 1 from public.conversations c
    join public.profile_matches m on m.id = c.match_id
    where c.id = p_conversation_id and m.status = 'active'
      and v_actor in (m.member_low, m.member_high)
      and not exists (
        select 1 from public.profile_blocks b
        where (b.blocker_id = v_actor and b.blocked_id = case
          when m.member_low = v_actor then m.member_high else m.member_low end)
           or (b.blocker_id = case
          when m.member_low = v_actor then m.member_high else m.member_low end
          and b.blocked_id = v_actor)
      )
  ) then raise exception 'Conversation is unavailable'; end if;

  insert into public.messages(conversation_id, sender_id, body)
  values (p_conversation_id, v_actor, btrim(p_body))
  returning id into v_message_id;

  update public.conversations
  set last_message_at = now()
  where id = p_conversation_id;

  return v_message_id;
end;
$$;

create or replace function public.joyheart_mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_updated integer;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;

  if not exists (
    select 1
    from public.conversations c
    join public.profile_matches m on m.id = c.match_id
    where c.id = p_conversation_id
      and m.status = 'active'
      and v_actor in (m.member_low, m.member_high)
      and not exists (
        select 1 from public.profile_blocks b
        where (b.blocker_id = v_actor and b.blocked_id = case
          when m.member_low = v_actor then m.member_high else m.member_low end)
           or (b.blocker_id = case
          when m.member_low = v_actor then m.member_high else m.member_low end
          and b.blocked_id = v_actor)
      )
  ) then raise exception 'Conversation is unavailable'; end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_actor
    and read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.joyheart_block_member(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_low uuid;
  v_high uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_target_id is null or p_target_id = v_actor then raise exception 'Invalid target'; end if;

  insert into public.profile_blocks(blocker_id, blocked_id)
  values (v_actor, p_target_id)
  on conflict (blocker_id, blocked_id) do nothing;

  v_low := least(v_actor, p_target_id);
  v_high := greatest(v_actor, p_target_id);
  update public.profile_matches
  set status = 'blocked', ended_at = now()
  where member_low = v_low and member_high = v_high and status = 'active';
end;
$$;

create or replace function public.joyheart_report_member(
  p_reported_id uuid, p_reason text, p_conversation_id uuid default null, p_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_report_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_reported_id is null or p_reported_id = v_actor then raise exception 'Invalid member'; end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 1000 then
    raise exception 'Please provide a short report reason';
  end if;

  -- If a report references a conversation, prove both members belong to it.
  if p_conversation_id is not null and not exists (
    select 1
    from public.conversations c
    join public.profile_matches m on m.id = c.match_id
    where c.id = p_conversation_id
      and v_actor in (m.member_low, m.member_high)
      and p_reported_id in (m.member_low, m.member_high)
      and p_reported_id <> v_actor
  ) then
    raise exception 'The selected conversation is unavailable';
  end if;

  -- A message report must reference a message in that conversation written by the reported member.
  if p_message_id is not null and (
    p_conversation_id is null or not exists (
      select 1 from public.messages msg
      where msg.id = p_message_id
        and msg.conversation_id = p_conversation_id
        and msg.sender_id = p_reported_id
    )
  ) then
    raise exception 'The selected message is unavailable';
  end if;

  insert into public.member_reports(reporter_id, reported_id, reason, conversation_id, message_id)
  values (v_actor, p_reported_id, btrim(p_reason), p_conversation_id, p_message_id)
  returning id into v_report_id;
  return v_report_id;
end;
$$;

revoke all on function public.joyheart_record_interaction(uuid, text) from public, anon;
revoke all on function public.joyheart_send_message(uuid, text) from public, anon;
revoke all on function public.joyheart_block_member(uuid) from public, anon;
revoke all on function public.joyheart_mark_conversation_read(uuid) from public, anon;
revoke all on function public.joyheart_report_member(uuid, text, uuid, uuid) from public, anon;
grant execute on function public.joyheart_record_interaction(uuid, text) to authenticated;
grant execute on function public.joyheart_send_message(uuid, text) to authenticated;
grant execute on function public.joyheart_block_member(uuid) to authenticated;
grant execute on function public.joyheart_mark_conversation_read(uuid) to authenticated;
grant execute on function public.joyheart_report_member(uuid, text, uuid, uuid) to authenticated;
