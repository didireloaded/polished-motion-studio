create or replace function public.decisions_rate_limit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    if new.actor_id <> old.actor_id or new.target_id <> old.target_id then
      raise exception 'A response cannot be moved to another member.' using errcode = '42501';
    end if;
    new.created_at := old.created_at;
  end if;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.liked and not old.liked) then
    new.created_at := now();
    if new.liked then
      perform pg_advisory_xact_lock(hashtextextended('like:' || new.actor_id::text, 0));
      if (select count(*) from public.decisions
          where actor_id = new.actor_id and liked and created_at > now() - interval '1 hour') >= 120 then
        raise exception 'Please take a short break before liking more profiles.' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.decisions_rate_limit() from public, anon, authenticated;
drop trigger if exists decisions_rate_limit on public.decisions;
create trigger decisions_rate_limit before insert or update on public.decisions
  for each row execute function public.decisions_rate_limit();

create or replace function public.messages_rate_limit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.created_at := now();
  perform pg_advisory_xact_lock(hashtextextended('message:' || new.sender_id::text, 0));
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.messages_rate_limit() from public, anon, authenticated;

create index if not exists decisions_recent_likes on public.decisions (actor_id, created_at desc) where liked;
create index if not exists decisions_target on public.decisions (target_id);
create index if not exists matches_user_b on public.matches (user_b);

-- The matching core must not reference a profile that does not exist.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'decisions_actor_profile_fkey') then
    alter table public.decisions add constraint decisions_actor_profile_fkey
      foreign key (actor_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'decisions_target_profile_fkey') then
    alter table public.decisions add constraint decisions_target_profile_fkey
      foreign key (target_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_user_a_profile_fkey') then
    alter table public.matches add constraint matches_user_a_profile_fkey
      foreign key (user_a) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_user_b_profile_fkey') then
    alter table public.matches add constraint matches_user_b_profile_fkey
      foreign key (user_b) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'messages_sender_profile_fkey') then
    alter table public.messages add constraint messages_sender_profile_fkey
      foreign key (sender_id) references public.profiles(id) on delete cascade;
  end if;
end;
$$;
