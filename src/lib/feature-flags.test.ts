import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlags,
  isFeatureEnabled,
  setFeatureFlagOverride,
} from "./feature-flags";
import { PRESENCE_HEARTBEAT_MS, isRandomFridayEnabled } from "@/features/random-friday";
import { MESSAGE_PAGE_SIZE } from "@/features/chat";

describe("feature flags & modular feature exports", () => {
  it("returns default flags and respects runtime overrides", () => {
    expect(isFeatureEnabled("randomFriday")).toBe(DEFAULT_FEATURE_FLAGS.randomFriday);
    expect(isRandomFridayEnabled()).toBe(true);
    setFeatureFlagOverride("randomFriday", false);
    expect(getFeatureFlags().randomFriday).toBe(false);
    expect(isRandomFridayEnabled()).toBe(false);
    setFeatureFlagOverride("randomFriday", true);
    expect(isFeatureEnabled("randomFriday")).toBe(true);
  });

  it("enforces throttled presence heartbeats and paginated message batch sizes", () => {
    expect(PRESENCE_HEARTBEAT_MS).toBeGreaterThanOrEqual(3000);
    expect(PRESENCE_HEARTBEAT_MS).toBeLessThanOrEqual(5000);
    expect(MESSAGE_PAGE_SIZE).toBe(25);
  });
});
