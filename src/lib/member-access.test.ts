// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const carol = "00000000-0000-4000-8000-000000000003";
const moderator = "00000000-0000-4000-8000-000000000004";
const matchId = "10000000-0000-4000-8000-000000000001";
const postId = "20000000-0000-4000-8000-000000000001";
const replyId = "30000000-0000-4000-8000-000000000001";
const reportId = "40000000-0000-4000-8000-000000000001";
const database = new PGlite();

function uncommentHistoricalMigration(file: string) {
  const lines = readFileSync(resolve(file), "utf8").split("\n");
  // These migrations have a leading explanation followed by SQL commented out
  // after they were applied outside the journal. Drop that explanation and
  // remove one comment prefix from the SQL body (leaving intentional comments).
  return lines
    .slice(1)
    .filter((line) => !line.toLowerCase().includes("alter publication"))
    .map((line) => (line.startsWith("-- ") ? line.slice(3) : line))
    .join("\n");
}

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

  const coreSql = readFileSync(resolve("drizzle/migrations/0000_namlink_core.sql"), "utf8")
    .split("\n")
    .filter((line) => !line.toLowerCase().includes("alter publication"))
    .join("\n");
  await database.exec(coreSql);
  for (const migration of [
    "0002_match_date_plans",
    "0003_date_plan_concurrency",
    "0004_accept_post_replies",
    "0005_community_events",
    "0007_moderation_queue",
    "0008_private_moderation_notes",
  ]) {
    await database.exec(uncommentHistoricalMigration(`drizzle/migrations/${migration}.sql`));
  }
  await database.query("INSERT INTO auth.users (id) VALUES ($1), ($2), ($3), ($4)", [
    alice,
    bob,
    carol,
    moderator,
  ]);
}, 30_000);

beforeEach(async () => {
  await database.exec(`
    TRUNCATE public.report_reviews, public.reports, public.event_rsvps, public.community_events,
      public.date_plan_events, public.date_plans, public.messages, public.post_replies, public.posts,
      public.matches, public.decisions, public.blocks, public.user_roles, public.profiles CASCADE;
  `);
  await database.query(
    `INSERT INTO public.profiles (id,display_name,age,town,active) VALUES
      ($1,'Alice',29,'Windhoek',true),
      ($2,'Bob',31,'Swakopmund',true),
      ($3,'Carol',27,'Windhoek',true),
      ($4,'Morgan',35,'Windhoek',true)`,
    [alice, bob, carol, moderator],
  );
  await database.query("INSERT INTO public.user_roles (user_id,role) VALUES ($1,'moderator')", [
    moderator,
  ]);
});

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

async function seedMatch() {
  await database.query("INSERT INTO public.matches (id,user_a,user_b) VALUES ($1,$2,$3)", [
    matchId,
    alice,
    bob,
  ]);
}

describe("member access rules in PostgreSQL", () => {
  it("shows members their own inactive profile and only active, unblocked others", async () => {
    await database.query("UPDATE public.profiles SET active=false WHERE id=$1", [alice]);
    expect(
      (
        await asMember<{ id: string; active: boolean }>(
          alice,
          "SELECT id,active FROM public.profiles ORDER BY id",
        )
      ).map((row) => row.id),
    ).toEqual([alice, bob, carol, moderator]);

    await database.query("UPDATE public.profiles SET active=false WHERE id=$1", [carol]);
    expect(
      (await asMember<{ id: string }>(bob, "SELECT id FROM public.profiles ORDER BY id")).map(
        (row) => row.id,
      ),
    ).toEqual([bob, moderator]);
  });

  it("hides a blocked member's profile in both directions", async () => {
    await asMember(alice, "INSERT INTO public.blocks (blocker_id,blocked_id) VALUES ($1,$2)", [
      alice,
      bob,
    ]);
    expect(await asMember(alice, "SELECT id FROM public.profiles WHERE id=$1", [bob])).toEqual([]);
    expect(await asMember(bob, "SELECT id FROM public.profiles WHERE id=$1", [alice])).toEqual([]);
    expect(await asMember(bob, "SELECT * FROM public.blocks")).toEqual([]);
  });

  it("allows only match participants to read matches and prevents client-created matches", async () => {
    await seedMatch();
    expect(await asMember(alice, "SELECT id FROM public.matches")).toEqual([{ id: matchId }]);
    expect(await asMember(bob, "SELECT id FROM public.matches")).toEqual([{ id: matchId }]);
    expect(await asMember(carol, "SELECT id FROM public.matches")).toEqual([]);
    await expect(
      asMember(alice, "INSERT INTO public.matches (id,user_a,user_b) VALUES ($1,$2,$3)", [
        "10000000-0000-4000-8000-000000000002",
        alice,
        carol,
      ]),
    ).rejects.toThrow(/permission denied|row-level security/i);
  });

  it("limits messages to match participants and revokes read/send access after a block", async () => {
    await seedMatch();
    await database.query(
      "INSERT INTO public.messages (match_id,sender_id,body) VALUES ($1,$2,'hello')",
      [matchId, alice],
    );
    expect(
      await asMember(bob, "SELECT body FROM public.messages WHERE match_id=$1", [matchId]),
    ).toEqual([{ body: "hello" }]);
    expect(
      await asMember(carol, "SELECT body FROM public.messages WHERE match_id=$1", [matchId]),
    ).toEqual([]);
    await expect(
      asMember(
        carol,
        "INSERT INTO public.messages (match_id,sender_id,body) VALUES ($1,$2,'intrude')",
        [matchId, carol],
      ),
    ).rejects.toThrow(/row-level security/i);

    await asMember(alice, "INSERT INTO public.blocks (blocker_id,blocked_id) VALUES ($1,$2)", [
      alice,
      bob,
    ]);
    expect(
      await asMember(bob, "SELECT body FROM public.messages WHERE match_id=$1", [matchId]),
    ).toEqual([]);
    await expect(
      asMember(
        bob,
        "INSERT INTO public.messages (match_id,sender_id,body) VALUES ($1,$2,'after block')",
        [matchId, bob],
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("makes private post replies readable only by their sender or post author", async () => {
    await database.query(
      "INSERT INTO public.posts (id,author_id,author_name,body,town) VALUES ($1,$2,'Alice','Coffee this weekend','Windhoek')",
      [postId, alice],
    );
    await database.query(
      "INSERT INTO public.post_replies (id,post_id,sender_id,sender_name,body) VALUES ($1,$2,$3,'Bob','I know a good cafe')",
      [replyId, postId, bob],
    );
    expect(
      await asMember(alice, "SELECT id FROM public.post_replies WHERE id=$1", [replyId]),
    ).toEqual([{ id: replyId }]);
    expect(
      await asMember(bob, "SELECT id FROM public.post_replies WHERE id=$1", [replyId]),
    ).toEqual([{ id: replyId }]);
    expect(
      await asMember(carol, "SELECT id FROM public.post_replies WHERE id=$1", [replyId]),
    ).toEqual([]);
  });

  it("limits report visibility to the reporter and moderators", async () => {
    await asMember(
      alice,
      "INSERT INTO public.reports (id,reporter_id,reported_id,category) VALUES ($1,$2,$3,'other')",
      [reportId, alice, bob],
    );
    expect(await asMember(alice, "SELECT id FROM public.reports")).toEqual([{ id: reportId }]);
    expect(await asMember(bob, "SELECT id FROM public.reports")).toEqual([]);
    expect(await asMember(carol, "SELECT id FROM public.reports")).toEqual([]);
    expect(await asMember(moderator, "SELECT id FROM public.reports")).toEqual([{ id: reportId }]);
  });

  it("enforces per-member date confirmations, clears them on edits, rejects stale versions, and audits changes", async () => {
    await seedMatch();
    const created = await asMember<{ version: number; scheduled_at: string | null }>(
      alice,
      `INSERT INTO public.date_plans (match_id,proposed_by,activity,town,scheduled_at)
       VALUES ($1,$2,'Coffee','Windhoek',NULL) RETURNING version,scheduled_at`,
      [matchId, alice],
    );
    expect(created).toEqual([{ version: 1, scheduled_at: null }]);

    const updatePlan = async (
      member: string,
      version: number,
      activity: string,
      confirmedA: boolean,
      confirmedB: boolean,
    ) =>
      asMember<{ version: number; confirmed_a: boolean; confirmed_b: boolean }>(
        member,
        `SELECT version,confirmed_a,confirmed_b FROM public.update_date_plan(
          $1,$2,$3,'','Windhoek',NULL,'',$4,$5
        )`,
        [matchId, version, activity, confirmedA, confirmedB],
      );

    expect(await updatePlan(alice, 1, "Coffee", true, false)).toEqual([
      { version: 2, confirmed_a: true, confirmed_b: false },
    ]);
    await expect(updatePlan(alice, 2, "Coffee", true, true)).rejects.toThrow(
      /only change your own confirmation/i,
    );
    expect(await updatePlan(bob, 2, "Coffee", true, true)).toEqual([
      { version: 3, confirmed_a: true, confirmed_b: true },
    ]);

    expect(await updatePlan(alice, 3, "Dinner", true, true)).toEqual([
      { version: 4, confirmed_a: false, confirmed_b: false },
    ]);
    await expect(updatePlan(bob, 3, "Coffee", true, true)).rejects.toThrow(/PLAN_VERSION_CONFLICT/);

    const events = await asMember<{ version: number; event_type: string }>(
      alice,
      "SELECT version,event_type FROM public.date_plan_events ORDER BY version",
    );
    expect(events).toEqual([
      { version: 1, event_type: "created" },
      { version: 2, event_type: "updated" },
      { version: 3, event_type: "updated" },
      { version: 4, event_type: "updated" },
    ]);
    expect(await asMember(bob, "SELECT match_id FROM public.date_plans")).toEqual([
      { match_id: matchId },
    ]);
    expect(await asMember(carol, "SELECT match_id FROM public.date_plans")).toEqual([]);
    expect(await asMember(carol, "SELECT match_id FROM public.date_plan_events")).toEqual([]);
  });
});
