// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const cara = "00000000-0000-4000-8000-000000000003";

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
  `);
  const core = readFileSync(resolve("drizzle/migrations/0000_namlink_core.sql"), "utf8");
  await db.exec(core.replace(/^alter publication .*;$/gm, ""));
  await db.exec(
    readFileSync(resolve("supabase/migrations/20261104170000_daily_quick_picks.sql"), "utf8"),
  );
  await db.query("INSERT INTO auth.users VALUES ($1),($2),($3)", [alice, bob, cara]);
  await db.query(
    `INSERT INTO profiles (id,display_name,age,town,pref_min_age,pref_max_age) VALUES
      ($1,'Alice',29,'Windhoek',24,35),($2,'Ben',30,'Windhoek',25,34),($3,'Cara',40,'Swakopmund',18,99)`,
    [alice, bob, cara],
  );
  const { rows } = await db.query<{ today: string; question_id: string }>(
    "SELECT timezone('Africa/Windhoek', now())::date::text today, public.current_daily_pick_question(timezone('Africa/Windhoek', now())::date) question_id",
  );
  await db.query(
    `INSERT INTO daily_quick_picks (user_id,pick_date,question_id,choice) VALUES
      ($1,$4,$5,'A'),($2,$4,$5,'A'),($3,$4,$5,'A')`,
    [alice, bob, cara, rows[0]!.today, rows[0]!.question_id],
  );
}, 30_000);

afterAll(async () => db.close());

async function asMember<T>(member: string, operation: (tx: PGlite) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE authenticated");
    await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [member]);
    return operation(tx as unknown as PGlite);
  });
}

async function candidates(member: string, questionId: string) {
  return asMember(member, async (tx) =>
    tx.query<{ candidate_id: string }>("SELECT * FROM public.shared_daily_pick_candidates($1)", [
      questionId,
    ]),
  );
}

describe("daily pick privacy and candidate eligibility", () => {
  it("allows members to read only their own private answer", async () => {
    const own = await asMember(alice, (tx) =>
      tx.query("SELECT * FROM daily_quick_picks WHERE user_id=$1", [alice]),
    );
    const other = await asMember(alice, (tx) =>
      tx.query("SELECT * FROM daily_quick_picks WHERE user_id=$1", [bob]),
    );
    expect(own.rows).toHaveLength(1);
    expect(other.rows).toHaveLength(0);
  });

  it("denies direct writes but allows the validated server function", async () => {
    const { rows } = await db.query<{ question_id: string }>(
      "SELECT public.current_daily_pick_question(timezone('Africa/Windhoek',now())::date) question_id",
    );
    const questionId = rows[0]!.question_id;
    await expect(
      asMember(alice, (tx) =>
        tx.query(
          "INSERT INTO daily_quick_picks(user_id,pick_date,question_id,choice) VALUES($1,timezone('Africa/Windhoek',now())::date,$2,'B')",
          [alice, questionId],
        ),
      ),
    ).rejects.toThrow(/permission denied|row-level security/i);
    await asMember(alice, (tx) =>
      tx.query("SELECT public.save_daily_quick_pick($1,'A')", [questionId]),
    );
  });

  it("returns only reciprocal-preference, unblocked, undecided same-pick candidates", async () => {
    const { rows } = await db.query<{ question_id: string }>(
      "SELECT public.current_daily_pick_question(timezone('Africa/Windhoek',now())::date) question_id",
    );
    const questionId = rows[0]!.question_id;
    expect((await candidates(alice, questionId)).rows.map((r) => r.candidate_id)).toEqual([bob]);
    await db.query("INSERT INTO blocks (blocker_id,blocked_id) VALUES ($1,$2)", [alice, bob]);
    expect((await candidates(alice, questionId)).rows).toEqual([]);
    await db.query("DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2", [alice, bob]);
    await db.query("INSERT INTO decisions (actor_id,target_id,liked) VALUES ($1,$2,false)", [
      alice,
      bob,
    ]);
    expect((await candidates(alice, questionId)).rows).toEqual([]);
  });

  it("rejects stale questions and anonymous access", async () => {
    await expect(
      asMember(alice, (tx) => tx.query("SELECT public.shared_daily_pick_candidates('not_today')")),
    ).rejects.toThrow(/no longer current/i);
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE anon");
        return tx.query("SELECT public.shared_daily_pick_candidates('kapana_biltong')");
      }),
    ).rejects.toThrow(/permission denied/i);
  });
});
