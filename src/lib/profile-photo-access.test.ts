// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001";
const viewer = "00000000-0000-4000-8000-000000000002";
const stranger = "00000000-0000-4000-8000-000000000003";
const main = `${owner}/00000000-0000-4000-8000-000000000010.jpg`;
const extra = `${owner}/00000000-0000-4000-8000-000000000011.jpg`;
const removed = `${owner}/00000000-0000-4000-8000-000000000012.jpg`;

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated, anon;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated, anon;
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
      SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1]
    $$;
  `);
  // Supabase's publication is transport configuration, not part of authorization.
  const core = readFileSync(resolve("drizzle/migrations/0000_namlink_core.sql"), "utf8");
  await db.exec(core.replace(/^alter publication .*;$/gm, ""));
  const historical = readFileSync(resolve("drizzle/migrations/0006_profile_photos.sql"), "utf8");
  // Historical SQL was commented after being applied outside the journal. Execute that actual definition.
  await db.exec(
    historical
      .split("\n")
      .slice(1)
      .map((line) => line.replace(/^-- ?/, ""))
      .join("\n"),
  );
  await db.exec(readFileSync(resolve("supabase/selfie-verification.sql"), "utf8"));
  await db.exec(
    readFileSync(
      resolve("supabase/migrations/20261104075633_restrict_extra_profile_photos.sql"),
      "utf8",
    ),
  );
  await db.query("INSERT INTO auth.users VALUES ($1),($2),($3)", [owner, viewer, stranger]);
  await db.query(
    `INSERT INTO public.profiles (id,display_name,age,town,photo_paths) VALUES
    ($1,'Anna',29,'Windhoek',ARRAY[$4,$5]),($2,'Ben',30,'Windhoek','{}'),($3,'Cara',28,'Windhoek','{}')`,
    [owner, viewer, stranger, main, extra],
  );
  await db.query(
    "INSERT INTO storage.objects (bucket_id,name) VALUES ('profile-photos',$1),('profile-photos',$2),('verification-selfies',$3),('profile-photos',$4)",
    [main, extra, `${owner}/selfie.jpg`, removed],
  );
  await db.query("INSERT INTO public.matches (user_a,user_b) VALUES ($1,$2)", [owner, viewer]);
}, 30_000);

afterAll(async () => {
  await db.close();
});

async function photos(userId: string, role = "authenticated") {
  return db.transaction(async (tx) => {
    await tx.exec(role === "anon" ? "SET LOCAL ROLE anon" : "SET LOCAL ROLE authenticated");
    await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [userId]);
    return (
      await tx.query<{ name: string }>("SELECT name FROM storage.objects ORDER BY name")
    ).rows.map((r) => r.name);
  });
}

describe("private media access in PostgreSQL", () => {
  it("shows only the primary discovery photo to an unmatched member", async () => {
    expect(await photos(stranger)).toEqual([main]);
  });
  it("lets the owner see their own photos and verification selfie", async () => {
    expect(await photos(owner)).toEqual([main, extra, removed, `${owner}/selfie.jpg`].sort());
  });
  it("lets a mutual match see extra photos but never the verification selfie", async () => {
    expect(await photos(viewer)).toEqual([main, extra]);
  });
  it("does not serve removed photos to a match", async () => {
    expect(await photos(viewer)).not.toContain(removed);
  });
  it("gives an anonymous visitor no private media", async () => {
    expect(await photos("", "anon")).toEqual([]);
  });
  it("removes matched photo access when either member blocks", async () => {
    await db.query("INSERT INTO public.blocks (blocker_id,blocked_id) VALUES ($1,$2)", [
      viewer,
      owner,
    ]);
    try {
      expect(await photos(viewer)).toEqual([]);
    } finally {
      await db.query("DELETE FROM public.blocks WHERE blocker_id=$1 AND blocked_id=$2", [
        viewer,
        owner,
      ]);
    }
  });
  it("hides an inactive member's photos from others while retaining owner access", async () => {
    await db.query("UPDATE public.profiles SET active=false WHERE id=$1", [owner]);
    try {
      expect(await photos(viewer)).toEqual([]);
      expect(await photos(owner)).toContain(extra);
    } finally {
      await db.query("UPDATE public.profiles SET active=true WHERE id=$1", [owner]);
    }
  });
  it("does not let another member upload into the owner's folder", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE authenticated");
        await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [stranger]);
        return tx.query(
          "INSERT INTO storage.objects (bucket_id,name) VALUES ('profile-photos',$1)",
          [`${owner}/new.jpg`],
        );
      }),
    ).rejects.toThrow(/row-level security/);
  });
});
