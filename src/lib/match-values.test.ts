import { describe, expect, it } from "vitest";
import { fallbackRanking, toValueCandidates, validateRanking, type MatchCandidate } from "./match-values";

const mk = (n: number, extra: Partial<MatchCandidate> = {}): MatchCandidate => ({
  matchId: `match-${n}`,
  id: `user-${n}`,
  age: 25,
  town: "Windhoek",
  intent: "Long-term",
  tags: [],
  bio: "",
  seeking: "",
  ...extra,
});

describe("match values ranking", () => {
  it("never sends names or ids to the model", () => {
    const out = JSON.stringify(toValueCandidates([mk(1)]));
    expect(out).not.toContain("user-1");
    expect(out).not.toContain("match-1");
  });

  it("drops unknown and duplicate refs and sorts by score", () => {
    const list = [mk(1), mk(2)];
    const r = validateRanking(
      { ranking: [{ ref: "m1", score: 40, reason: "a" }, { ref: "m9", score: 99, reason: "x" }, { ref: "m2", score: 80, reason: "b" }, { ref: "m1", score: 100, reason: "dup" }] },
      list,
    );
    expect(r.map((x) => x.matchId)).toEqual(["match-2", "match-1"]);
  });

  it("clamps scores to 0-100", () => {
    const r = validateRanking({ ranking: [{ ref: "m1", score: 250, reason: "" }] }, [mk(1)]);
    expect(r[0]!.score).toBe(100);
  });

  it("fallback ranks keyword overlap first", () => {
    const r = fallbackRanking("hiking and faith", [mk(1), mk(2, { tags: ["hiking"], bio: "faith matters" })]);
    expect(r[0]!.matchId).toBe("match-2");
  });
});
