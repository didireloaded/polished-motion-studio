create table public.report_reviews (
  report_id uuid primary key references public.reports(id) on delete cascade,
  moderator_note text not null default '' check (char_length(moderator_note) <= 500),
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid not null references auth.users(id) on delete restrict
);
grant select on public.report_reviews to authenticated;
grant all on public.report_reviews to service_role;
alter table public.report_reviews enable row level security;
create policy "moderators read private report review" on public.report_reviews
  for select to authenticated using (
    public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin')
  );

insert into public.report_reviews (report_id, moderator_note, reviewed_at, reviewed_by)
select id, moderator_note, reviewed_at, reviewed_by
from public.reports
where reviewed_at is not null and reviewed_by is not null
on conflict (report_id) do update set
  moderator_note = excluded.moderator_note,
  reviewed_at = excluded.reviewed_at,
  reviewed_by = excluded.reviewed_by;

alter table public.reports
  drop column moderator_note,
  drop column reviewed_at,
  drop column reviewed_by;

create or replace function public.review_report(
  _report_id uuid,
  _status text,
  _moderator_note text default ''
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not (
    public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin')
  ) then
    raise exception 'Moderator access required.' using errcode = '42501';
  end if;
  if _status is null or _status not in ('reviewed', 'actioned', 'dismissed') then
    raise exception 'Invalid report status.' using errcode = '22023';
  end if;
  if char_length(coalesce(_moderator_note, '')) > 500 then
    raise exception 'Moderator notes must be 500 characters or fewer.' using errcode = '22023';
  end if;
  update public.reports set status = _status where id = _report_id;
  if not found then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;
  insert into public.report_reviews (report_id, moderator_note, reviewed_at, reviewed_by)
    values (_report_id, coalesce(_moderator_note, ''), now(), auth.uid())
    on conflict (report_id) do update set
      moderator_note = excluded.moderator_note,
      reviewed_at = excluded.reviewed_at,
      reviewed_by = excluded.reviewed_by;
end $$;
