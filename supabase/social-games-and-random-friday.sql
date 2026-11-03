-- ============================================================================
-- Mutal — Lovable Cloud Backend Schema for Interactive Social Features
-- Includes:
--   1. public.random_friday_queue      (Live queue & throttled presence heartbeats)
--   2. public.random_friday_sessions   (30s live rounds, +15s chemistry bonus, mutual Stay -> Match trigger)
--   3. public.profile_game_cards       (30s Elevator Pitch, Two Truths & a Lie, This-or-That Rapid Radar)
--   4. public.chat_game_rounds         (In-chat First Date Dilemma, Emoji Story Decode, Two Truths)
--   5. public.feed_poll_votes          (Community Hot-Take Meter & Green/Red Flag Polls)
--   6. public.get_chat_overview        (Single-trip RPC for matches + counterpart profiles + last message)
-- ============================================================================

-- 1. Live Queue & Throttled Presence Heartbeats (Random Friday & Speed Dating)
create table if not exists public.random_friday_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  town text not null default 'Windhoek' check (char_length(btrim(town)) between 2 and 40),
  mode text not null default 'random_friday' check (mode in ('random_friday', 'speed_dating')),
  status text not null default 'waiting' check (status in ('waiting', 'paired', 'completed')),
  streak_count int not null default 0 check (streak_count >= 0 and streak_count <= 100),
  joined_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now()
);

create index if not exists idx_rf_queue_mode_status_town
  on public.random_friday_queue (mode, status, town, last_heartbeat_at desc);

grant select, insert, update, delete on public.random_friday_queue to authenticated;
grant all on public.random_friday_queue to service_role;
alter table public.random_friday_queue enable row level security;

create policy "members read active unblocked queue" on public.random_friday_queue
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      last_heartbeat_at > now() - interval '30 seconds'
      and not public.is_blocked_between(auth.uid(), user_id)
    )
  );

create policy "members manage own queue entry" on public.random_friday_queue
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- 2. Random Friday & Speed Dating Live Sessions
create table if not exists public.random_friday_sessions (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  town text not null default 'Windhoek' check (char_length(town) <= 40),
  mode text not null default 'random_friday' check (mode in ('random_friday', 'speed_dating')),
  icebreaker_prompt text not null default '' check (char_length(icebreaker_prompt) <= 240),
  base_seconds int not null default 30 check (base_seconds between 15 and 300),
  bonus_seconds int not null default 0 check (bonus_seconds between 0 and 120),
  chemistry_unlocked boolean not null default false,
  user_a_message text check (char_length(user_a_message) <= 300),
  user_b_message text check (char_length(user_b_message) <= 300),
  user_a_decision text not null default 'pending' check (user_a_decision in ('pending', 'stay', 'skip')),
  user_b_decision text not null default 'pending' check (user_b_decision in ('pending', 'stay', 'skip')),
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 seconds'),
  check (user_a < user_b)
);

create index if not exists idx_rf_sessions_users
  on public.random_friday_sessions (user_a, user_b, created_at desc);

grant select, insert, update on public.random_friday_sessions to authenticated;
grant all on public.random_friday_sessions to service_role;
alter table public.random_friday_sessions enable row level security;

create policy "session participants read" on public.random_friday_sessions
  for select to authenticated
  using (
    (user_a = auth.uid() or user_b = auth.uid())
    and not public.is_blocked_between(user_a, user_b)
  );

create policy "session participants insert" on public.random_friday_sessions
  for insert to authenticated
  with check (
    (user_a = auth.uid() or user_b = auth.uid())
    and not public.is_blocked_between(user_a, user_b)
  );

create policy "session participants update" on public.random_friday_sessions
  for update to authenticated
  using (
    (user_a = auth.uid() or user_b = auth.uid())
    and not public.is_blocked_between(user_a, user_b)
  )
  with check (
    (user_a = auth.uid() or user_b = auth.uid())
    and not public.is_blocked_between(user_a, user_b)
  );

-- Trigger: Automatically convert mutual 'stay' + dual messages into Chemistry Bonus & Permanent Match
create or replace function public.handle_random_friday_session_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Unlock +15s Instant Chemistry Bonus when both participants send a message in the round
  if new.user_a_message is not null
     and new.user_b_message is not null
     and not old.chemistry_unlocked then
    new.chemistry_unlocked := true;
    new.bonus_seconds := least(120, new.bonus_seconds + 15);
    new.expires_at := new.expires_at + interval '15 seconds';
  end if;

  -- Convert mutual 'stay' into a permanent match in public.matches & public.decisions
  if new.user_a_decision = 'stay'
     and new.user_b_decision = 'stay'
     and new.matched_at is null
     and not public.is_blocked_between(new.user_a, new.user_b) then
    new.matched_at := now();

    insert into public.decisions (actor_id, target_id, liked)
    values
      (new.user_a, new.user_b, true),
      (new.user_b, new.user_a, true)
    on conflict (actor_id, target_id) do update set liked = true;

    insert into public.matches (user_a, user_b)
    values (least(new.user_a, new.user_b), greatest(new.user_a, new.user_b))
    on conflict (user_a, user_b) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_random_friday_session_update on public.random_friday_sessions;
create trigger trg_random_friday_session_update
  before update on public.random_friday_sessions
  for each row execute function public.handle_random_friday_session_update();


-- 3. Profile Game Cards (30s Elevator Pitch, Two Truths & a Lie, This-or-That Rapid Radar)
create table if not exists public.profile_game_cards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  elevator_prompt text not null default '' check (char_length(elevator_prompt) <= 160),
  elevator_script text not null default '' check (char_length(elevator_script) <= 400),
  elevator_audio_path text check (char_length(elevator_audio_path) <= 240),
  two_truths_statements text[] not null default '{}' check (cardinality(two_truths_statements) <= 3),
  two_truths_lie_index smallint not null default 2 check (two_truths_lie_index between 0 and 2),
  this_or_that_answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profile_game_cards to authenticated;
grant all on public.profile_game_cards to service_role;
alter table public.profile_game_cards enable row level security;

create policy "members read unblocked game cards" on public.profile_game_cards
  for select to authenticated
  using (
    user_id = auth.uid()
    or not public.is_blocked_between(auth.uid(), user_id)
  );

create policy "members upsert own game card" on public.profile_game_cards
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- 4. In-Chat Cooperative Mini-Games (First Date Dilemma, Emoji Story Decode, Two Truths)
create table if not exists public.chat_game_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  game_type text not null check (game_type in ('first_date_dilemma', 'emoji_story', 'two_truths')),
  prompt_key text not null check (char_length(prompt_key) <= 80),
  user_a_choice text check (char_length(user_a_choice) <= 200),
  user_b_choice text check (char_length(user_b_choice) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, game_type, prompt_key)
);

create index if not exists idx_chat_game_rounds_match
  on public.chat_game_rounds (match_id, updated_at desc);

grant select, insert, update on public.chat_game_rounds to authenticated;
grant all on public.chat_game_rounds to service_role;
alter table public.chat_game_rounds enable row level security;

create policy "chat members read game rounds" on public.chat_game_rounds
  for select to authenticated
  using (public.can_chat(match_id, auth.uid()));

create policy "chat members insert game rounds" on public.chat_game_rounds
  for insert to authenticated
  with check (public.can_chat(match_id, auth.uid()));

create policy "chat members update game rounds" on public.chat_game_rounds
  for update to authenticated
  using (public.can_chat(match_id, auth.uid()))
  with check (public.can_chat(match_id, auth.uid()));


-- 5. Community Feed Polls (Spicy Namibian Hot-Take Meter & Green/Red Flag Votes)
create table if not exists public.feed_poll_votes (
  poll_id text not null check (char_length(btrim(poll_id)) between 2 and 60),
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (char_length(btrim(choice)) between 1 and 40),
  town text not null default 'Windhoek' check (char_length(town) <= 40),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index if not exists idx_feed_poll_votes_poll
  on public.feed_poll_votes (poll_id, choice);

grant select, insert, update, delete on public.feed_poll_votes to authenticated;
grant all on public.feed_poll_votes to service_role;
alter table public.feed_poll_votes enable row level security;

create policy "members read poll votes" on public.feed_poll_votes
  for select to authenticated
  using (true);

create policy "members cast own poll vote" on public.feed_poll_votes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- 6. Single-Trip Chat Overview RPC (Matches + Counterpart Profile + Latest Message in 1 Query)
create or replace function public.get_chat_overview()
returns table (
  match_id uuid,
  match_created_at timestamptz,
  partner_id uuid,
  partner_name text,
  partner_age int,
  partner_town text,
  partner_bio text,
  partner_tags text[],
  partner_intent text,
  partner_seeking text,
  partner_photo_paths text[],
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_body text,
  last_message_created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as match_id,
    m.created_at as match_created_at,
    p.id as partner_id,
    p.display_name as partner_name,
    p.age as partner_age,
    p.town as partner_town,
    p.bio as partner_bio,
    p.tags as partner_tags,
    p.intent as partner_intent,
    p.seeking as partner_seeking,
    p.photo_paths as partner_photo_paths,
    lm.id as last_message_id,
    lm.sender_id as last_message_sender_id,
    lm.body as last_message_body,
    lm.created_at as last_message_created_at
  from public.matches m
  join public.profiles p
    on p.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join lateral (
    select msg.id, msg.sender_id, msg.body, msg.created_at
    from public.messages msg
    where msg.match_id = m.id
    order by msg.created_at desc
    limit 1
  ) lm on true
  where (m.user_a = auth.uid() or m.user_b = auth.uid())
    and not public.is_blocked_between(m.user_a, m.user_b)
  order by coalesce(lm.created_at, m.created_at) desc;
$$;

grant execute on function public.get_chat_overview() to authenticated;
