import { describe, expect, it } from "vitest";
import {
  dateSuggestionInputSchema,
  dateSuggestionNote,
  dateSuggestionPrompt,
  parseDateSuggestion,
} from "./date-suggestions";

const input = {
  matchId: "00000000-0000-4000-8000-000000000001",
  town: "Windhoek",
  sharedInterests: "Coffee, walking",
  preferences: "Quiet and inexpensive",
  availability: ["Saturday morning"] as const,
};
const suggestion = {
  activity: "Coffee and a public park walk",
  timeWindow: "Saturday morning" as const,
  note: "Choose a public cafe together, then a short walk nearby.",
  reason: "Combines your interest in coffee and walking.",
};

describe("date suggestions", () => {
  it("requires availability and rejects duplicated or unknown time windows", () => {
    expect(dateSuggestionInputSchema.safeParse({ ...input, availability: [] }).success).toBe(false);
    expect(
      dateSuggestionInputSchema.safeParse({
        ...input,
        availability: ["Saturday morning", "Saturday morning"],
      }).success,
    ).toBe(false);
    expect(
      dateSuggestionInputSchema.safeParse({ ...input, availability: ["Any time"] }).success,
    ).toBe(false);
  });

  it("sends interests and availability to the model without match or member identifiers", () => {
    const prompt = dateSuggestionPrompt(dateSuggestionInputSchema.parse(input));
    expect(prompt.sharedInterests).toBe("Coffee, walking");
    expect(prompt.availability).toEqual(["Saturday morning"]);
    expect(prompt).not.toHaveProperty("matchId");
  });

  it("accepts a suggestion only for an offered time window", () => {
    expect(parseDateSuggestion(JSON.stringify(suggestion), ["Saturday morning"])).toEqual(
      suggestion,
    );
    expect(parseDateSuggestion(JSON.stringify(suggestion), ["Sunday afternoon"])).toBeNull();
    expect(parseDateSuggestion("not JSON", ["Saturday morning"])).toBeNull();
  });

  it("keeps the preferred window in the shared plan note without claiming a confirmed date", () => {
    expect(dateSuggestionNote(suggestion)).toContain("Preferred window: Saturday morning.");
    expect(dateSuggestionNote({ ...suggestion, note: "a".repeat(200) }).length).toBeLessThanOrEqual(
      300,
    );
  });
});
