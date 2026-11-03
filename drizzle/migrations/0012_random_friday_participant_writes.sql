-- RLS limits rows, not columns. Validate participant-owned fields before the
-- match-creation trigger observes a session decision.
create or replace function public.guard_random_friday_participant_write()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  own_decision text;
  own_message text;
begin
  if current_user = 'service_role' then
    return new;
  end if;

  if actor is null or actor not in (new.user_a, new.user_b) then
    raise exception 'Not a session participant' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.user_a <> old.user_a or new.user_b <> old.user_b then
      raise exception 'Session participants cannot change' using errcode = '42501';
    end if;
    if actor = new.user_a then
      if to_jsonb(new) - 'user_a_decision' - 'user_a_message'
         <> to_jsonb(old) - 'user_a_decision' - 'user_a_message' then
        raise exception 'Only your own decision and message may change' using errcode = '42501';
      end if;
    else
      if to_jsonb(new) - 'user_b_decision' - 'user_b_message'
         <> to_jsonb(old) - 'user_b_decision' - 'user_b_message' then
        raise exception 'Only your own decision and message may change' using errcode = '42501';
      end if;
    end if;
  else
    own_decision := case when actor = new.user_a then new.user_b_decision else new.user_a_decision end;
    own_message := case when actor = new.user_a then new.user_b_message else new.user_a_message end;
    if own_decision <> 'pending' or own_message is not null
       or new.matched_at is not null or new.chemistry_unlocked
       or new.bonus_seconds <> 0 then
      raise exception 'Cannot set another participant decision or session outcome' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists a_guard_random_friday_participant_write on public.random_friday_sessions;
create trigger a_guard_random_friday_participant_write
  before insert or update on public.random_friday_sessions
  for each row execute function public.guard_random_friday_participant_write();
