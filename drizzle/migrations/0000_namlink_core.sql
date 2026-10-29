create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  age int not null check (age between 18 and 99),
  town text not null check (char_length(town) <= 40),
  bio text not null default '' check (char_length(bio) <= 500),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  intent text not null default 'A relationship' check (char_length(intent) <= 40),
  seeking text not null default '' check (char_length(seeking) <= 400),
  pref_min_age int check (pref_min_age between 18 and 99),
  pref_max_age int check (pref_max_age between 18 and 99),
  pref_town text check (char_length(pref_town) <= 40),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.blocks (
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
grant select, insert, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;
alter table public.blocks enable row level security;
create policy "own blocks read" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "own blocks insert" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "own blocks delete" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.is_blocked_between(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.blocks where (blocker_id = _a and blocked_id = _b) or (blocker_id = _b and blocked_id = _a)) $$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "active unblocked profiles read" on public.profiles for select to authenticated
  using (active and id <> auth.uid() and not public.is_blocked_between(auth.uid(), id));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile delete" on public.profiles for delete to authenticated using (id = auth.uid());

create table public.decisions (
  actor_id uuid not null,
  target_id uuid not null,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, target_id),
  check (actor_id <> target_id)
);
grant select, insert, update, delete on public.decisions to authenticated;
grant all on public.decisions to service_role;
alter table public.decisions enable row level security;
create policy "own decisions read" on public.decisions for select to authenticated using (actor_id = auth.uid());
create policy "own decisions insert" on public.decisions for insert to authenticated
  with check (actor_id = auth.uid() and not public.is_blocked_between(actor_id, target_id));
create policy "own decisions update" on public.decisions for update to authenticated using (actor_id = auth.uid()) with check (actor_id = auth.uid());
create policy "own decisions delete" on public.decisions for delete to authenticated using (actor_id = auth.uid());

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null,
  user_b uuid not null,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
-- clients may only read matches; they are created by the mutual-like trigger
grant select on public.matches to authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "member reads unblocked match" on public.matches for select to authenticated
  using ((user_a = auth.uid() or user_b = auth.uid()) and not public.is_blocked_between(user_a, user_b));

create or replace function public.handle_mutual_like()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.liked and exists (select 1 from public.decisions d where d.actor_id = new.target_id and d.target_id = new.actor_id and d.liked)
     and not public.is_blocked_between(new.actor_id, new.target_id) then
    insert into public.matches (user_a, user_b)
    values (least(new.actor_id, new.target_id), greatest(new.actor_id, new.target_id))
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger decisions_mutual_like after insert or update on public.decisions
  for each row execute function public.handle_mutual_like();

create or replace function public.can_chat(_match_id uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.matches m where m.id = _match_id and (m.user_a = _user or m.user_b = _user) and not public.is_blocked_between(m.user_a, m.user_b)) $$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_match_created on public.messages (match_id, created_at desc);
create index messages_sender_created on public.messages (sender_id, created_at desc);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "chat members read" on public.messages for select to authenticated using (public.can_chat(match_id, auth.uid()));
create policy "chat members send" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_chat(match_id, auth.uid()));

create or replace function public.messages_rate_limit()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.created_at := now();
  if (select count(*) from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger messages_rate_limit before insert on public.messages for each row execute function public.messages_rate_limit();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  author_name text not null check (char_length(author_name) <= 40),
  body text not null check (char_length(btrim(body)) between 3 and 300),
  town text not null check (char_length(town) <= 40),
  created_at timestamptz not null default now()
);
create index posts_created on public.posts (created_at desc);
grant select, insert, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "read unblocked posts" on public.posts for select to authenticated using (author_id = auth.uid() or not public.is_blocked_between(auth.uid(), author_id));
create policy "insert own posts" on public.posts for insert to authenticated
  with check (author_id = auth.uid() and author_name = (select display_name from public.profiles where id = auth.uid()));
create policy "delete own posts" on public.posts for delete to authenticated using (author_id = auth.uid());

create table public.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  sender_id uuid not null,
  sender_name text not null check (char_length(sender_name) <= 40),
  body text not null check (char_length(btrim(body)) between 2 and 300),
  created_at timestamptz not null default now()
);
grant select, insert on public.post_replies to authenticated;
grant all on public.post_replies to service_role;
alter table public.post_replies enable row level security;
create or replace function public.post_author(_post uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select author_id from public.posts where id = _post $$;
create policy "sender or author reads reply" on public.post_replies for select to authenticated
  using ((sender_id = auth.uid() or public.post_author(post_id) = auth.uid()) and not public.is_blocked_between(sender_id, public.post_author(post_id)));
create policy "send reply" on public.post_replies for insert to authenticated
  with check (sender_id = auth.uid() and public.post_author(post_id) <> auth.uid()
    and not public.is_blocked_between(auth.uid(), public.post_author(post_id))
    and sender_name = (select display_name from public.profiles where id = auth.uid()));

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  reported_id uuid not null,
  post_id uuid,
  category text not null check (category in ('harassment','fake_profile','inappropriate','scam','underage','other')),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reporter or moderator reads" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "file own report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;