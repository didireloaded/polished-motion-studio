// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const deleted = "00000000-0000-4000-8000-000000000001";
const retained = "00000000-0000-4000-8000-000000000002";

beforeAll(async () => {
  await db.exec(`
    create role authenticated nologin;
    create role anon nologin;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth,storage to authenticated,anon;
    create table public.profiles(id uuid primary key references auth.users on delete cascade);
    create table public.matches(id int primary key, user_a uuid references public.profiles on delete cascade, user_b uuid references public.profiles on delete cascade);
    create table public.messages(id int primary key, match_id int references public.matches on delete cascade);
    create table public.posts(id int primary key,author_id uuid,body text);
    create table public.post_replies(id int primary key,post_id int references public.posts on delete cascade,sender_id uuid);
    create table public.blocks(blocker_id uuid,blocked_id uuid);
    create table public.community_events(id int primary key,created_by uuid not null constraint community_events_created_by_fkey references auth.users);
    create table public.reports(id int primary key,reporter_id uuid,reported_id uuid);
    create table public.report_reviews(report_id int primary key references public.reports on delete cascade,reviewed_by uuid not null constraint report_reviews_reviewed_by_fkey references auth.users on delete restrict,moderator_note text);
    create table public.selfie_verifications(user_id uuid primary key references auth.users on delete cascade,reviewed_by uuid constraint selfie_verifications_reviewed_by_fkey references auth.users);
    create table storage.objects(id text primary key,bucket_id text,name text,owner_id uuid);
    alter table public.profiles enable row level security;
    alter table public.posts enable row level security;
    alter table storage.objects enable row level security;
    grant select,insert on public.profiles,public.posts,storage.objects to authenticated;
    grant select on public.profiles to anon;
    create policy profiles_read on public.profiles for select to authenticated using (true);
    create policy own_posts on public.posts for all to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
    create policy storage_read on storage.objects for select to authenticated using(true);
    create policy storage_write on storage.objects for insert to authenticated with check(owner_id=auth.uid());
  `);
  await db.exec(
    readFileSync(resolve("supabase/migrations/20261105063000_account_deletion.sql"), "utf8"),
  );
  await db.query("insert into auth.users values ($1),($2)", [deleted, retained]);
  await db.query("insert into public.profiles values ($1),($2)", [deleted, retained]);
  await db.query("insert into public.posts values (1,$1,'mine'),(2,$2,'theirs')", [
    deleted,
    retained,
  ]);
  await db.query("insert into public.post_replies values (1,2,$1),(2,2,$2)", [deleted, retained]);
  await db.query("insert into public.blocks values ($1,$2)", [deleted, retained]);
  await db.query("insert into public.matches values (1,$1,$2);", [deleted, retained]);
  await db.exec("insert into public.messages values (1,1)");
  await db.query("insert into public.community_events values (1,$1)", [deleted]);
  await db.query("insert into public.reports values (1,$1,$2)", [deleted, retained]);
  await db.query("insert into public.report_reviews values (1,$1,'Safety evidence')", [deleted]);
  await db.query("insert into public.selfie_verifications values ($1,$2)", [retained, deleted]);
}, 30_000);

afterAll(async () => db.close());

async function asMember(id: string, sql: string) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
    return tx.query(sql);
  });
}

it("permits existing members under their original policies and denies direct Auth deletion", async () => {
  expect((await asMember(retained, "select * from public.profiles")).rows).toHaveLength(2);
  expect((await asMember(retained, "select * from public.posts")).rows).toHaveLength(1);
  await expect(
    asMember(retained, `delete from auth.users where id='${deleted}'`),
  ).rejects.toMatchObject({ code: "42501" });
});

it("removes account content while retaining safety evidence, and rejects the deleted member's JWT", async () => {
  await db.query("delete from auth.users where id=$1", [deleted]);
  expect((await db.query("select * from public.posts")).rows).toHaveLength(1);
  expect((await db.query("select * from public.post_replies")).rows).toHaveLength(1);
  for (const table of ["matches", "messages", "blocks", "community_events"]) {
    expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
  }
  expect((await db.query("select * from public.reports")).rows).toHaveLength(1);
  expect(
    (await db.query("select reviewed_by,moderator_note from public.report_reviews")).rows,
  ).toEqual([{ reviewed_by: null, moderator_note: "Safety evidence" }]);
  expect((await db.query("select reviewed_by from public.selfie_verifications")).rows).toEqual([
    { reviewed_by: null },
  ]);
  expect((await asMember(deleted, "select * from public.profiles")).rows).toEqual([]);
  await expect(
    asMember(
      deleted,
      `insert into storage.objects values ('stale','profile-photos','${deleted}/photo.jpg','${deleted}')`,
    ),
  ).rejects.toMatchObject({ code: "42501" });
  expect((await asMember(retained, "select * from public.profiles")).rows).toHaveLength(1);
});
