import { describe, expect, it } from "vitest";
import {
  dailyHotTakePrompts,
  flagSwipePolls,
  speedDatingPrompts,
  thisOrThatQuestions,
} from "./social-games";

describe("member activity prompts", () => {
  it("provides editorial prompts without fabricated member vote totals", () => {
    expect(flagSwipePolls.length).toBeGreaterThan(0);
    expect(flagSwipePolls.every((poll) => !("greenFlagPct" in poll))).toBe(true);
    expect(dailyHotTakePrompts.length).toBeGreaterThan(0);
  });

  it("provides prompts for the live choice and chat flows", () => {
    expect(thisOrThatQuestions.length).toBeGreaterThan(0);
    expect(speedDatingPrompts.length).toBeGreaterThan(0);
  });
});
