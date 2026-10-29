create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('match', 'message', 'post_reply')),
  target_url text not null check (target_url in ('/chats', '/posts')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "Members read own notifications" on public.notifications;
create policy "Members read own notifications" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Members mark own notifications read" on public.notifications;
create policy "Members mark own notifications read" on public.notifications
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.notifications from anon, authenticated;
grant select, update (read_at) on public.notifications to authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) between 20 and 2048 and endpoint like 'https://%'),
  p256dh text not null check (length(p256dh) between 20 and 512),
  auth text not null check (length(auth) between 8 and 256),
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists "Members read own push subscriptions" on public.push_subscriptions;
create policy "Members read own push subscriptions" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Members add own push subscriptions" on public.push_subscriptions;
create policy "Members add own push subscriptions" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Members remove own push subscriptions" on public.push_subscriptions;
create policy "Members remove own push subscriptions" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;

create or replace function public.enqueue_match_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.notifications (user_id, kind, target_url)
  values (new.user_a, 'match', '/chats'), (new.user_b, 'match', '/chats');
  return new;
end;
$$;

create or replace function public.enqueue_message_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare recipient uuid;
begin
  select case when m.user_a = new.sender_id then m.user_b else m.user_a end
    into recipient from public.matches m where m.id = new.match_id;
  if recipient is not null and not public.is_blocked_between(new.sender_id, recipient) then
    insert into public.notifications (user_id, kind, target_url)
    values (recipient, 'message', '/chats');
  end if;
  return new;
end;
$$;

create or replace function public.enqueue_post_reply_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare recipient uuid;
begin
  select p.author_id into recipient from public.posts p where p.id = new.post_id;
  if recipient is not null and recipient <> new.sender_id
     and not public.is_blocked_between(new.sender_id, recipient) then
    insert into public.notifications (user_id, kind, target_url)
    values (recipient, 'post_reply', '/posts');
  end if;
  return new;
end;
$$;

revoke execute on function public.enqueue_match_notification() from public, anon, authenticated;
revoke execute on function public.enqueue_message_notification() from public, anon, authenticated;
revoke execute on function public.enqueue_post_reply_notification() from public, anon, authenticated;

drop trigger if exists notify_match on public.matches;
create trigger notify_match after insert on public.matches
  for each row execute function public.enqueue_match_notification();
drop trigger if exists notify_message on public.messages;
create trigger notify_message after insert on public.messages
  for each row execute function public.enqueue_message_notification();
drop trigger if exists notify_post_reply on public.post_replies;
create trigger notify_post_reply after insert on public.post_replies
  for each row execute function public.enqueue_post_reply_notification();

do $$
begin
  if not exists (
    select 1 from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime' and pr.prrelid = 'public.notifications'::regclass
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
