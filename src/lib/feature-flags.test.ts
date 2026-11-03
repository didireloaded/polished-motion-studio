import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlags,
  isFeatureEnabled,
  setFeatureFlagOverride,
} from "./feature-flags";

describe("feature-flags", () => {
  it("returns default feature flags and supports runtime overrides", () => {
    expect(getFeatureFlags()).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(isFeatureEnabled("randomFriday")).toBe(true);

    setFeatureFlagOverride("randomFriday", false);
    expect(isFeatureEnabled("randomFriday")).toBe(false);

    setFeatureFlagOverride("randomFriday", true);
    expect(isFeatureEnabled("randomFriday")).toBe(true);
  });
});
