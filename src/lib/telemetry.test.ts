import { describe, expect, it } from "vitest";
import {
  analyticsConsent,
  captureProductEvent,
  setAnalyticsConsent,
  type ProductEventName,
} from "./telemetry";

describe("telemetry match events", () => {
  it("supports match_created, match_say_hello, and match_keep_swiping events safely", async () => {
    const events: ProductEventName[] = ["match_created", "match_say_hello", "match_keep_swiping"];
    expect(events).toEqual(["match_created", "match_say_hello", "match_keep_swiping"]);

    await setAnalyticsConsent(false);
    expect(analyticsConsent()).toBe(false);

    // Must resolve cleanly without throwing when consent is off or PostHog is unconfigured
    await expect(captureProductEvent("match_created", { mode: "live" })).resolves.toBeUndefined();
    await expect(
      captureProductEvent("match_say_hello", { via: "button" }),
    ).resolves.toBeUndefined();
    await expect(captureProductEvent("match_keep_swiping")).resolves.toBeUndefined();
  });
});
