// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const anna = "00000000-0000-4000-8000-000000000001";
const ben = "00000000-0000-4000-8000-000000000002";
const cara = "00000000-0000-4000-8000-000000000003";
const database = new PGlite();

beforeAll(async () => {
  await database.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  `);
  // Bootstrap the actual poll table, grants, and legacy policies, then apply the privacy migration.
  const socialSql = readFileSync(resolve("supabase/social-games-and-random-friday.sql"), "utf8");
  const start = socialSql.indexOf("create table if not exists public.feed_poll_votes");
  const end = socialSql.indexOf("-- 6.", start);
  if (start < 0 || end < 0) throw new Error("Poll bootstrap SQL section was not found");
  await database.exec(socialSql.slice(start, end));
  await database.exec(
    readFileSync(resolve("drizzle/migrations/0011_restrict_poll_vote_reads.sql"), "utf8"),
  );
  await database.query("INSERT INTO auth.users (id) VALUES ($1), ($2), ($3)", [anna, ben, cara]);
  await database.query(
    `INSERT INTO public.feed_poll_votes (poll_id,user_id,choice,town) VALUES
    ('weekend-plan',$1,'green','Windhoek'),
    ('weekend-plan',$2,'red','Windhoek'),
    ('weekend-plan',$3,'green','Swakopmund'),
    ('coffee-walk',$1,'yes','Windhoek')`,
    [anna, ben, cara],
  );
}, 30_000);

afterAll(async () => {
  await database.close();
});

async function asMember<T>(memberId: string, query: string, parameters: unknown[] = []) {
  return database.transaction(async (transaction) => {
    await transaction.exec("SET LOCAL ROLE authenticated");
    await transaction.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [memberId]);
    return (await transaction.query<T>(query, parameters)).rows;
  });
}

describe("poll vote privacy in PostgreSQL", () => {
  it("lets a member read their own votes across polls", async () => {
    const rows = await asMember<{ user_id: string; poll_id: string }>(
      anna,
      "SELECT user_id,poll_id FROM public.feed_poll_votes ORDER BY poll_id",
    );
    expect(rows).toEqual([
      { user_id: anna, poll_id: "coffee-walk" },
      { user_id: anna, poll_id: "weekend-plan" },
    ]);
  });

  it("hides another member's raw vote even when its user id is requested directly", async () => {
    expect(
      await asMember(anna, "SELECT * FROM public.feed_poll_votes WHERE user_id=$1", [ben]),
    ).toEqual([]);
    const rows = await asMember<{ user_id: string }>(
      ben,
      "SELECT user_id FROM public.feed_poll_votes",
    );
    expect(rows).toEqual([{ user_id: ben }]);
  });

  it("returns aggregate counts across members without voter identifiers or locations", async () => {
    const rows = await asMember<{ choice: string; votes: number | string }>(
      anna,
      "SELECT * FROM public.get_poll_tally($1) ORDER BY choice",
      ["weekend-plan"],
    );
    expect(rows.map((row) => ({ choice: row.choice, votes: Number(row.votes) }))).toEqual([
      { choice: "green", votes: 2 },
      { choice: "red", votes: 1 },
    ]);
    for (const row of rows) expect(Object.keys(row).sort()).toEqual(["choice", "votes"]);
  });

  it("keeps aggregate results specific to the requested poll", async () => {
    const rows = await asMember<{ choice: string; votes: number | string }>(
      ben,
      "SELECT * FROM public.get_poll_tally($1)",
      ["coffee-walk"],
    );
    expect(rows.map((row) => ({ choice: row.choice, votes: Number(row.votes) }))).toEqual([
      { choice: "yes", votes: 1 },
    ]);
    expect(
      await asMember(ben, "SELECT * FROM public.get_poll_tally($1)", ["missing-poll"]),
    ).toEqual([]);
  });

  it("does not expose rows or counts without a member identity", async () => {
    expect(await asMember("", "SELECT * FROM public.feed_poll_votes")).toEqual([]);
    expect(await asMember("", "SELECT * FROM public.get_poll_tally($1)", ["weekend-plan"])).toEqual(
      [],
    );
  });

  it("denies anonymous callers access to raw votes and to the aggregate function", async () => {
    await expect(
      database.transaction(async (transaction) => {
        await transaction.exec("SET LOCAL ROLE anon");
        return transaction.query("SELECT * FROM public.feed_poll_votes");
      }),
    ).rejects.toThrow(/permission denied/);
    await expect(
      database.transaction(async (transaction) => {
        await transaction.exec("SET LOCAL ROLE anon");
        return transaction.query("SELECT * FROM public.get_poll_tally('weekend-plan')");
      }),
    ).rejects.toThrow(/permission denied/);
  });
});
