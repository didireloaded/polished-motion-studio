import { describe, expect, it } from "vitest";
import {
  castFeedPollVoteSchema,
  joinLiveQueueSchema,
  liveRoundDecisionSchema,
  normalizeOrderedPair,
  saveProfileGameCardSchema,
  submitChatGameChoiceSchema,
  tallyPollVotes,
} from "./social-backend";

describe("Lovable Cloud social backend helpers & schemas", () => {
  it("normalizes user UUID pairs into canonical ascending order (user_a < user_b)", () => {
    const u1 = "00000000-0000-0000-0000-000000000001";
    const u2 = "00000000-0000-0000-0000-000000000002";

    const forward = normalizeOrderedPair(u1, u2);
    expect(forward).toEqual({ user_a: u1, user_b: u2, amUserA: true });

    const reversed = normalizeOrderedPair(u2, u1);
    expect(reversed).toEqual({ user_a: u1, user_b: u2, amUserA: false });
  });

  it("validates live queue, round decision, profile game card, chat game, and poll schemas", () => {
    const queue = joinLiveQueueSchema.parse({ town: "Windhoek", mode: "random_friday" });
    expect(queue.streakCount).toBe(0);

    const decision = liveRoundDecisionSchema.parse({
      partnerId: "550e8400-e29b-41d4-a716-446655440001",
      decision: "stay",
      bonusSeconds: 18,
    });
    expect(decision.decision).toBe("stay");
    expect(decision.bonusSeconds).toBe(18);

    const card = saveProfileGameCardSchema.parse({
      elevatorPrompt: "Why you should take me to Swakopmund",
      elevatorScript: "Best coffee, dunes, and sunset playlist.",
      twoTruthsStatements: ["Climbed Dune 45", "Cooked for 30 people", "Never had kapana"],
      twoTruthsLieIndex: 2,
      thisOrThatAnswers: { weekend: "Swakopmund coast" },
    });
    expect(card.twoTruthsStatements).toHaveLength(3);

    const chatGame = submitChatGameChoiceSchema.parse({
      matchId: "550e8400-e29b-41d4-a716-446655440099",
      gameType: "first_date_dilemma",
      promptKey: "whk-dilemma-1",
      choice: "Sunset picnic at Avis Dam",
    });
    expect(chatGame.gameType).toBe("first_date_dilemma");

    const vote = castFeedPollVoteSchema.parse({
      pollId: "hot-take-1",
      choice: "agree",
      town: "Windhoek",
    });
    expect(vote.choice).toBe("agree");
  });

  it("tallies poll votes into counts and percentages accurately", () => {
    const result = tallyPollVotes(
      [{ choice: "green" }, { choice: "green" }, { choice: "green" }, { choice: "red" }],
      ["green", "red"],
    );
    expect(result.total).toBe(4);
    expect(result.counts).toEqual({ green: 3, red: 1 });
    expect(result.percentages).toEqual({ green: 75, red: 25 });
  });
});
