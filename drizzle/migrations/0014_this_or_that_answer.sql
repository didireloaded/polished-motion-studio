create or replace function public.save_this_or_that_answer(_question_id text, _choice text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if _question_id not in ('kapana_biltong', 'weekend_escape', 'sunday_rhythm', 'coffee_order', 'braai_role')
     or _choice not in ('A', 'B') then
    raise exception 'Invalid answer' using errcode = '22023';
  end if;

  insert into public.profile_game_cards (user_id, this_or_that_answers)
  values (auth.uid(), jsonb_build_object(_question_id, _choice))
  on conflict (user_id) do update
    set this_or_that_answers = public.profile_game_cards.this_or_that_answers
      || excluded.this_or_that_answers,
        updated_at = now();
end;
$$;

revoke all on function public.save_this_or_that_answer(text, text) from public, anon;
grant execute on function public.save_this_or_that_answer(text, text) to authenticated;
