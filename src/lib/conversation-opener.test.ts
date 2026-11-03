import { describe, expect, it } from "vitest";
import {
  fallbackConversationOpener,
  OPENER_TONES,
  toOpenerPromptInput,
  validateOpenerOutput,
  type OpenerProfileInput,
} from "./conversation-opener";

const sampleProfile: OpenerProfileInput = {
  town: "Swakopmund",
  intent: "A relationship",
  tags: ["Coffee", "Road trips", "Photography"],
  bio: "Weekend dune walks and coastal coffee spots.",
  seeking: "Someone kind and curious.",
};

describe("conversation opener helpers", () => {
  it("builds a clean prompt input without personal identifiers", () => {
    const payload = JSON.stringify(
      toOpenerPromptInput(sampleProfile, "playful", "coastal road trips"),
    );
    expect(payload).toContain("Swakopmund");
    expect(payload).toContain("playful");
    expect(payload).toContain("coastal road trips");
    expect(payload).not.toContain("user_id");
    expect(payload).not.toContain("display_name");
  });

  it("validates structured model output and rejects empty openers", () => {
    const valid = validateOpenerOutput({
      opener: "Quick Swakopmund question: best spot for a morning flat white after a beach walk?",
      followUpTopic: "Compare favourite coastal cafés",
      whyItWorks: "Grounds the question in their town and love for coffee.",
    });
    expect(valid).not.toBeNull();
    expect(valid?.opener).toContain("Swakopmund");

    expect(validateOpenerOutput({ opener: "Hi" })).toBeNull();
    expect(validateOpenerOutput(null)).toBeNull();
  });

  it("produces distinct deterministic openers for each tone", () => {
    const drafts = OPENER_TONES.map((tone) =>
      fallbackConversationOpener(sampleProfile, tone, "sunset dunes"),
    );
    const uniqueOpeners = new Set(drafts.map((d) => d.opener));
    expect(uniqueOpeners.size).toBe(OPENER_TONES.length);
    for (const draft of drafts) {
      expect(draft.opener.length).toBeGreaterThan(15);
      expect(draft.whyItWorks.length).toBeGreaterThan(5);
    }
  });
});
