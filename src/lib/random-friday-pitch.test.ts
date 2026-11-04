import { describe, expect, it } from "vitest";
import {
  estimateSpokenSeconds,
  fallbackRandomFridayPitch,
  formatShareablePitchCard,
  toPitchPromptInput,
  validatePitchOutput,
  type PitchProfileInput,
} from "./random-friday-pitch";

const sampleProfile: PitchProfileInput = {
  displayName: "Leandra",
  age: 26,
  town: "Windhoek",
  intent: "A relationship",
  tags: ["Art & design", "Coffee", "Road trips"],
  bio: "Building things during the week. Finding a little space to breathe on the weekends.",
  seeking: "Someone curious and kind.",
};

describe("Random Friday 30-second AI pitch generator", () => {
  it("sanitizes and bounds profile input for the AI Gateway prompt", () => {
    const promptInput = toPitchPromptInput(sampleProfile, "playful", "Swakopmund road trip");
    expect(promptInput.style).toBe("playful");
    expect(promptInput.memberProfile.displayName).toBe("Leandra");
    expect(promptInput.memberProfile.town).toBe("Windhoek");
    expect(promptInput.focusHint).toBe("Swakopmund road trip");
  });

  it("validates structured JSON output and computes estimated spoken seconds", () => {
    const validJson = JSON.stringify({
      headline: "Leandra · Windhoek · Coffee & Road Trips",
      pitch:
        "Hey, I'm Leandra in Windhoek. During the week I'm deep into art and design, and on weekends I'm always up for good coffee or an unhurried road trip out of town.",
      closingHook: "Where is your favorite weekend stop outside Windhoek?",
    });
    const parsed = validatePitchOutput(validJson);
    expect(parsed).not.toBeNull();
    expect(parsed?.estimatedSeconds).toBeGreaterThanOrEqual(12);
    expect(parsed?.estimatedSeconds).toBeLessThanOrEqual(30);
    expect(validatePitchOutput("not-json")).toBeNull();
  });

  it("builds a Namibia-grounded fallback pitch and shareable card", () => {
    const draft = fallbackRandomFridayPitch(sampleProfile, "storyteller", "coastal drives");
    expect(draft.pitch).toContain("Windhoek");
    expect(draft.pitch).toContain("coastal drives");
    expect(draft.estimatedSeconds).toBeLessThanOrEqual(30);

    const card = formatShareablePitchCard(sampleProfile, draft);
    expect(card).toContain("Leandra");
    expect(card).toContain("Leandra, 26 · Windhoek");
    expect(card).toContain(sampleProfile.bio);
    expect(card).toContain(sampleProfile.intent);
    expect(card).toContain(draft.pitch);
    expect(card).toContain(draft.closingHook);
  });
  it("counts the 30-second boundary without rounding longer text down", () => {
    expect(estimateSpokenSeconds("word ".repeat(69))).toBe(30);
    expect(estimateSpokenSeconds("word ".repeat(70))).toBe(31);
  });

  it("rejects an overlong response instead of clipping its sentence or hiding its duration", () => {
    const longPitch = "word ".repeat(100);
    expect(estimateSpokenSeconds(longPitch)).toBeGreaterThan(30);
    expect(
      validatePitchOutput(
        JSON.stringify({
          headline: "An introduction",
          pitch: longPitch,
          closingHook: "What would you like to share?",
        }),
      ),
    ).toBeNull();
  });

  it("keeps fallback introductions under 30 seconds without inventing hobbies", () => {
    for (const style of ["warm", "playful", "confident", "storyteller"] as const) {
      const draft = fallbackRandomFridayPitch(
        { ...sampleProfile, tags: [], bio: "", intent: "Friends first" },
        style,
        "a long weekend idea ".repeat(20),
      );
      expect(draft.estimatedSeconds).toBeLessThanOrEqual(30);
      expect(draft.pitch).not.toContain("coffee");
      expect(draft.pitch).not.toContain("playlist");
      expect(draft.pitch).toContain("friends first");
    }
  });
});
