create table public.daily_quick_picks (
  user_id uuid not null references auth.users(id) on delete cascade,
  pick_date date not null,
  question_id text not null check (question_id in (
    'kapana_biltong', 'weekend_escape', 'sunday_rhythm', 'coffee_order', 'braai_role'
  )),
  choice text not null check (choice in ('A', 'B')),
  created_at timestamptz not null default now(),
  primary key (user_id, pick_date)
);

alter table public.daily_quick_picks enable row level security;
grant select on public.daily_quick_picks to authenticated;
grant all on public.daily_quick_picks to service_role;
create policy "members read own daily picks" on public.daily_quick_picks
  for select to authenticated using (user_id = auth.uid());

create or replace function public.current_daily_pick_question(_date date)
returns text language sql immutable set search_path = public
as $$
  select (array['kapana_biltong','weekend_escape','sunday_rhythm','coffee_order','braai_role'])[
    mod((_date - date '2026-01-01'), 5) + 1
  ]
$$;

create or replace function public.save_daily_quick_pick(_question_id text, _choice text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  _today date := timezone('Africa/Windhoek', now())::date;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if _choice not in ('A','B') or _question_id is distinct from public.current_daily_pick_question(_today) then
    raise exception 'This daily pick is no longer current' using errcode = '22023';
  end if;

  insert into public.daily_quick_picks (user_id, pick_date, question_id, choice)
  values (auth.uid(), _today, _question_id, _choice)
  on conflict (user_id, pick_date) do update
    set question_id = excluded.question_id, choice = excluded.choice;
end;
$$;

create or replace function public.shared_daily_pick_candidates(_question_id text)
returns table (candidate_id uuid)
language plpgsql stable security definer set search_path = public
as $$
declare
  _viewer uuid := auth.uid();
  _today date := timezone('Africa/Windhoek', now())::date;
begin
  if _viewer is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if _question_id is distinct from public.current_daily_pick_question(_today) then
    raise exception 'This daily pick is no longer current' using errcode = '22023';
  end if;

  return query
  select candidate.id
  from public.daily_quick_picks mine
  join public.profiles viewer on viewer.id = _viewer and viewer.active
  join public.daily_quick_picks theirs
    on theirs.pick_date = mine.pick_date
    and theirs.question_id = mine.question_id
    and theirs.choice = mine.choice
    and theirs.user_id <> mine.user_id
  join public.profiles candidate on candidate.id = theirs.user_id and candidate.active
  where mine.user_id = _viewer
    and mine.pick_date = _today
    and mine.question_id = _question_id
    and not public.is_blocked_between(_viewer, candidate.id)
    and not exists (
      select 1 from public.decisions d
      where d.actor_id = _viewer and d.target_id = candidate.id
    )
    and (viewer.pref_min_age is null or candidate.age >= viewer.pref_min_age)
    and (viewer.pref_max_age is null or candidate.age <= viewer.pref_max_age)
    and (candidate.pref_min_age is null or viewer.age >= candidate.pref_min_age)
    and (candidate.pref_max_age is null or viewer.age <= candidate.pref_max_age)
    and (viewer.pref_town is null or lower(viewer.pref_town) = lower(candidate.town))
    and (candidate.pref_town is null or lower(candidate.pref_town) = lower(viewer.town))
  order by theirs.created_at desc
  limit 20;
end;
$$;

revoke all on function public.save_daily_quick_pick(text, text) from public, anon;
revoke all on function public.shared_daily_pick_candidates(text) from public, anon;
grant execute on function public.save_daily_quick_pick(text, text) to authenticated;
grant execute on function public.shared_daily_pick_candidates(text) to authenticated;
