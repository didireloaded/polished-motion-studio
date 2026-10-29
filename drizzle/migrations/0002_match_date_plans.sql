-- One shared, editable date plan for each active match.
create table public.date_plans (
  match_id uuid primary key references public.matches(id) on delete cascade,
  proposed_by uuid not null,
  activity text not null check (char_length(btrim(activity)) between 2 and 80),
  venue_name text not null default '' check (char_length(venue_name) <= 120),
  town text not null check (char_length(btrim(town)) between 2 and 80),
  scheduled_at timestamptz,
  note text not null default '' check (char_length(note) <= 300),
  confirmed_a boolean not null default false,
  confirmed_b boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index date_plans_updated on public.date_plans (updated_at desc);
grant select, insert, update on public.date_plans to authenticated;
grant all on public.date_plans to service_role;
alter table public.date_plans enable row level security;

create policy "matched members read date plan" on public.date_plans
  for select to authenticated using (public.can_chat(match_id, auth.uid()));
create policy "matched members create date plan" on public.date_plans
  for insert to authenticated
  with check (proposed_by = auth.uid() and public.can_chat(match_id, auth.uid()));
create policy "matched members update date plan" on public.date_plans
  for update to authenticated
  using (public.can_chat(match_id, auth.uid()))
  with check (public.can_chat(match_id, auth.uid()));

-- A member may change only their own confirmation. Editing plan details clears
-- both confirmations, so neither person can confirm an obsolete arrangement.
create or replace function public.protect_date_plan()
returns trigger language plpgsql set search_path = public
as $$
declare
  _a uuid;
  _b uuid;
  _uid uuid := auth.uid();
  _details_changed boolean;
begin
  select user_a, user_b into _a, _b from public.matches where id = new.match_id;
  if _uid is null or _a is null or not (_uid = _a or _uid = _b) or public.is_blocked_between(_a, _b) then
    raise exception 'This date plan is unavailable.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.proposed_by <> _uid then
      raise exception 'Only the proposing member can create this plan.' using errcode = '42501';
    end if;
    new.confirmed_a := false;
    new.confirmed_b := false;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.match_id <> old.match_id or new.proposed_by <> old.proposed_by or new.created_at <> old.created_at then
    raise exception 'The match and proposer cannot be changed.' using errcode = '42501';
  end if;
  if (_uid = _a and new.confirmed_b is distinct from old.confirmed_b)
     or (_uid = _b and new.confirmed_a is distinct from old.confirmed_a) then
    raise exception 'You can only change your own confirmation.' using errcode = '42501';
  end if;

  _details_changed := new.activity is distinct from old.activity
    or new.venue_name is distinct from old.venue_name
    or new.town is distinct from old.town
    or new.scheduled_at is distinct from old.scheduled_at
    or new.note is distinct from old.note;
  if _details_changed then
    new.confirmed_a := false;
    new.confirmed_b := false;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger date_plans_protect before insert or update on public.date_plans
  for each row execute function public.protect_date_plan();

alter publication supabase_realtime add table public.date_plans;
