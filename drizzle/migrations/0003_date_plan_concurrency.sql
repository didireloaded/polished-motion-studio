-- Detect concurrent edits to a shared plan and retain a participant-readable audit trail.
alter table public.date_plans
  add column version integer not null default 1 check (version > 0),
  add column updated_by uuid references auth.users(id) on delete set null;

create table public.date_plan_events (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.date_plans(match_id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  version integer not null check (version > 0),
  event_type text not null check (event_type in ('created', 'updated')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index date_plan_events_match_created on public.date_plan_events (match_id, created_at desc);
grant select on public.date_plan_events to authenticated;
grant all on public.date_plan_events to service_role;
alter table public.date_plan_events enable row level security;
create policy "matched members read date plan events" on public.date_plan_events
  for select to authenticated using (public.can_chat(match_id, auth.uid()));

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
    new.version := 1;
    new.updated_by := _uid;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.match_id <> old.match_id or new.proposed_by <> old.proposed_by or new.created_at <> old.created_at then
    raise exception 'The match and proposer cannot be changed.' using errcode = '42501';
  end if;
  if new.version <> old.version + 1 or new.updated_by is distinct from _uid then
    raise exception 'Date plans must be updated through the versioned plan action.' using errcode = '42501';
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

create or replace function public.log_date_plan_event()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  _payload jsonb;
begin
  if tg_op = 'INSERT' then
    _payload := jsonb_build_object(
      'activity', new.activity,
      'venue_name', new.venue_name,
      'town', new.town,
      'scheduled_at', new.scheduled_at,
      'note', new.note,
      'confirmed_a', new.confirmed_a,
      'confirmed_b', new.confirmed_b
    );
    insert into public.date_plan_events (match_id, actor_id, version, event_type, payload)
      values (new.match_id, auth.uid(), new.version, 'created', _payload);
    return new;
  end if;

  _payload := jsonb_strip_nulls(jsonb_build_object(
    'activity', case when new.activity is distinct from old.activity then to_jsonb(new.activity) end,
    'venue_name', case when new.venue_name is distinct from old.venue_name then to_jsonb(new.venue_name) end,
    'town', case when new.town is distinct from old.town then to_jsonb(new.town) end,
    'scheduled_at', case when new.scheduled_at is distinct from old.scheduled_at then to_jsonb(new.scheduled_at) end,
    'note', case when new.note is distinct from old.note then to_jsonb(new.note) end,
    'confirmed_a', case when new.confirmed_a is distinct from old.confirmed_a then to_jsonb(new.confirmed_a) end,
    'confirmed_b', case when new.confirmed_b is distinct from old.confirmed_b then to_jsonb(new.confirmed_b) end
  ));
  insert into public.date_plan_events (match_id, actor_id, version, event_type, payload)
    values (new.match_id, auth.uid(), new.version, 'updated', _payload);
  return new;
end $$;
create trigger date_plan_audit after insert or update on public.date_plans
  for each row execute function public.log_date_plan_event();

-- All client edits must pass the version check in this RPC; the trigger also
-- checks that the caller changes only their own confirmation.
revoke update on public.date_plans from authenticated;
create or replace function public.update_date_plan(
  p_match_id uuid,
  p_expected_version integer,
  p_activity text,
  p_venue_name text,
  p_town text,
  p_scheduled_at timestamptz,
  p_note text,
  p_confirmed_a boolean,
  p_confirmed_b boolean
)
returns public.date_plans
language plpgsql security definer set search_path = public
as $$
declare
  _plan public.date_plans;
  _uid uuid := auth.uid();
begin
  if _uid is null or not public.can_chat(p_match_id, _uid) then
    raise exception 'This date plan is unavailable.' using errcode = '42501';
  end if;

  update public.date_plans
  set activity = p_activity,
      venue_name = p_venue_name,
      town = p_town,
      scheduled_at = p_scheduled_at,
      note = p_note,
      confirmed_a = p_confirmed_a,
      confirmed_b = p_confirmed_b,
      version = version + 1,
      updated_by = _uid
  where match_id = p_match_id and version = p_expected_version
  returning * into _plan;

  if not found then
    raise exception 'PLAN_VERSION_CONFLICT' using errcode = 'P0001';
  end if;
  return _plan;
end $$;
revoke all on function public.update_date_plan(uuid, integer, text, text, text, timestamptz, text, boolean, boolean) from public, anon;
grant execute on function public.update_date_plan(uuid, integer, text, text, text, timestamptz, text, boolean, boolean) to authenticated;

