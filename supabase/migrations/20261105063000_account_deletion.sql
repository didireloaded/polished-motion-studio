-- Complete account cleanup through Auth's admin deletion API.
-- NOT VALID preserves historical orphan records while enforcing future references
-- and cascading records belonging to an account that is explicitly deleted.
alter table public.posts add constraint posts_author_account_fkey
  foreign key (author_id) references auth.users(id) on delete cascade not valid;
alter table public.post_replies add constraint post_replies_sender_account_fkey
  foreign key (sender_id) references auth.users(id) on delete cascade not valid;
alter table public.blocks add constraint blocks_blocker_account_fkey
  foreign key (blocker_id) references auth.users(id) on delete cascade not valid;
alter table public.blocks add constraint blocks_blocked_account_fkey
  foreign key (blocked_id) references auth.users(id) on delete cascade not valid;

alter table public.community_events drop constraint community_events_created_by_fkey;
alter table public.community_events add constraint community_events_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;
alter table public.selfie_verifications drop constraint selfie_verifications_reviewed_by_fkey;
alter table public.selfie_verifications add constraint selfie_verifications_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

-- Safety reports and moderation notes are retained, without the deleted reviewer link.
alter table public.report_reviews alter column reviewed_by drop not null;
alter table public.report_reviews drop constraint report_reviews_reviewed_by_fkey;
alter table public.report_reviews add constraint report_reviews_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;

-- Auth deletion cannot invalidate an already-issued JWT's signature. Require a
-- current account in addition to each existing row-level authorization policy.
create schema if not exists private;
create function private.account_exists()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from auth.users where id = auth.uid())
$$;
revoke all on function private.account_exists() from public;
grant usage on schema private to authenticated;
grant execute on function private.account_exists() to authenticated;

do $$
declare app_table record;
begin
  for app_table in select tablename from pg_catalog.pg_tables where schemaname = 'public'
  loop
    execute format(
      'create policy "existing account required" on public.%I as restrictive for all to authenticated using ((select private.account_exists())) with check ((select private.account_exists()))',
      app_table.tablename
    );
  end loop;
end;
$$;

create policy "existing account required" on storage.objects
as restrictive for all to authenticated
using (
  bucket_id not in ('profile-photos', 'voice-intros', 'verification-selfies')
  or (select private.account_exists())
)
with check (
  bucket_id not in ('profile-photos', 'voice-intros', 'verification-selfies')
  or (select private.account_exists())
);
