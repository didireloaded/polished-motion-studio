import { describe, expect, it } from "vitest";
import { fallbackRank, filterEligible, validateModelOutput, type MemberProfile } from "./recommend";

const base: MemberProfile = { id: "me", display_name: "Me", age: 28, town: "Windhoek", bio: "", tags: ["Coffee"], intent: "A relationship", seeking: "", active: true, pref_min_age: null, pref_max_age: null, pref_town: null };
const p = (id: string, o: Partial<MemberProfile> = {}): MemberProfile => ({ ...base, id, display_name: id, ...o });

describe("eligibility", () => {
  it("excludes self, inactive, decided and blocked", () => {
    const list = [p("me"), p("off", { active: false }), p("seen"), p("blk"), p("ok")];
    expect(filterEligible(base, list, { decidedIds: ["seen"], blockedIds: ["blk"] }).map((c) => c.id)).toEqual(["ok"]);
  });
  it("applies age and town preferences both ways", () => {
    const me = { ...base, pref_max_age: 30, pref_town: "Windhoek" };
    const list = [p("old", { age: 35 }), p("far", { town: "Rundu" }), p("picky", { pref_max_age: 25 }), p("ok")];
    expect(filterEligible(me, list, { decidedIds: [], blockedIds: [] }).map((c) => c.id)).toEqual(["ok"]);
  });
});

describe("model output validation", () => {
  const eligible = [p("a"), p("b")];
  it("drops invented refs and duplicates", () => {
    const out = validateModelOutput({ recommendations: [{ ref: "c9", reason: "x" }, { ref: "c2", reason: "Both love coffee" }, { ref: "c2", reason: "dup" }] }, eligible);
    expect(out).toEqual([{ id: "b", reason: "Both love coffee" }]);
  });
  it("returns nothing for malformed output", () => {
    expect(validateModelOutput("nope", eligible)).toEqual([]);
  });
  it("fallback only returns eligible ids", () => {
    expect(fallbackRank(base, eligible).map((r) => r.id).sort()).toEqual(["a", "b"]);
  });
});
