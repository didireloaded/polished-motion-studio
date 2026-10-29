alter table public.post_replies
  add column accepted_at timestamptz,
  add column accepted_by uuid references auth.users(id) on delete set null,
  add column accepted_match_id uuid references public.matches(id) on delete set null;

create or replace function public.accept_post_reply(_reply_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  _author uuid;
  _sender uuid;
  _match_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to accept a reply.' using errcode = '42501';
  end if;
  select p.author_id, r.sender_id, r.accepted_match_id
    into _author, _sender, _match_id
    from public.post_replies r
    join public.posts p on p.id = r.post_id
    where r.id = _reply_id;
  if _author is null or _author <> auth.uid() then
    raise exception 'Only the post author can accept this reply.' using errcode = '42501';
  end if;
  if _sender is null or _sender = _author or public.is_blocked_between(_author, _sender) then
    raise exception 'This reply is no longer available.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles a, public.profiles b
    where a.id = _author and a.active and a.age >= 18
      and b.id = _sender and b.active and b.age >= 18
  ) then
    raise exception 'Both members need active adult profiles to connect.' using errcode = '42501';
  end if;

  if _match_id is null then
    insert into public.matches (user_a, user_b)
      values (least(_author, _sender), greatest(_author, _sender))
      on conflict (user_a, user_b) do nothing;
    select id into _match_id from public.matches
      where user_a = least(_author, _sender) and user_b = greatest(_author, _sender);
    update public.post_replies
      set accepted_at = coalesce(accepted_at, now()),
          accepted_by = _author,
          accepted_match_id = _match_id
      where id = _reply_id;
  end if;
  return _match_id;
end $$;
revoke all on function public.accept_post_reply(uuid) from public, anon;
grant execute on function public.accept_post_reply(uuid) to authenticated;
