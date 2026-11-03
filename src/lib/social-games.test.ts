import { describe, expect, it } from "vitest";
import { people } from "@/lib/namlink";
import {
  buildTwoTruthsReply,
  computeVibeAlignment,
  dailyHotTakePrompts,
  flagSwipePolls,
  getElevatorPitchForPerson,
  getEmojiStoryForPerson,
  getFirstDateDilemmaForTown,
  getPersonThisOrThatAnswers,
  getTwoTruthsForPerson,
  thisOrThatQuestions,
} from "./social-games";

describe("social-games", () => {
  it("generates a 30-second elevator pitch with 3 reaction prompts", () => {
    const person = people[0]!;
    const pitch = getElevatorPitchForPerson(person);
    expect(pitch.prompt.length).toBeGreaterThan(5);
    expect(pitch.pitchText.length).toBeGreaterThan(10);
    expect(pitch.durationSeconds).toBeLessThanOrEqual(30);
    expect(pitch.reactions).toHaveLength(3);
  });

  it("builds a Two Truths & a Lie game with exactly one lie and a Gotcha reply draft", () => {
    const person = people[0]!;
    const game = getTwoTruthsForPerson(person);
    expect(game.items).toHaveLength(3);
    expect(game.items.filter((item) => item.isLie)).toHaveLength(1);

    const lieIndex = game.items.findIndex((item) => item.isLie);
    const result = buildTwoTruthsReply(game, lieIndex);
    expect(result.correct).toBe(true);
    expect(result.replyDraft).toContain("Gotcha! Tell me the story behind");
  });

  it("computes Vibe Alignment percentage across the 5 This or That choices", () => {
    const person = people[0]!;
    const theirAnswers = getPersonThisOrThatAnswers(person);
    const identical = computeVibeAlignment(theirAnswers, theirAnswers);
    expect(thisOrThatQuestions).toHaveLength(5);
    expect(identical.percentage).toBe(100);
    expect(identical.matchedCount).toBe(5);
  });

  it("provides First Date Dilemma, Emoji Story Decode, and Red/Green Flag polls", () => {
    const person = people[0]!;
    const dilemma = getFirstDateDilemmaForTown(person.town, person.id);
    expect(dilemma.optionA.label.length).toBeGreaterThan(5);
    expect(dilemma.optionB.label.length).toBeGreaterThan(5);

    const emojiStory = getEmojiStoryForPerson(person);
    expect(emojiStory.options).toHaveLength(3);
    expect(emojiStory.emojis.length).toBeGreaterThan(2);

    expect(flagSwipePolls.length).toBeGreaterThanOrEqual(3);
    expect(dailyHotTakePrompts.length).toBeGreaterThanOrEqual(1);
  });
});
