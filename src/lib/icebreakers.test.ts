import { describe, expect, it } from "vitest";
import { generateIcebreakers, localDateSpots, namibianPrompts } from "./icebreakers";

describe("icebreakers & local Namibian context", () => {
  it("generates 3 tailored icebreakers from tags and town", () => {
    const prompts = generateIcebreakers({
      name: "Leandra",
      town: "Windhoek",
      tags: ["Coffee", "Road trips"],
      intent: "A relationship",
    });
    expect(prompts).toHaveLength(3);
    expect(prompts[0]).toContain("coffee");
    expect(prompts[1]).toContain("road trip");
    expect(prompts[2]).toContain("Windhoek");
  });

  it("falls back gracefully when profile fields are sparse", () => {
    const prompts = generateIcebreakers({});
    expect(prompts).toHaveLength(3);
    expect(new Set(prompts).size).toBe(3);
  });

  it("provides curated local date spots and Namibian prompts", () => {
    expect(localDateSpots["Windhoek"]?.length).toBeGreaterThan(0);
    expect(localDateSpots["Swakopmund"]?.length).toBeGreaterThan(0);
    expect(namibianPrompts.length).toBeGreaterThanOrEqual(5);
  });
});
