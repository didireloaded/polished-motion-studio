// Centralized feature flags with local override and environment support.

export type FeatureFlagKey =
  "randomFriday" | "speedDatingMixer" | "aiOpenerStudio" | "socialMiniGames" | "elevatorPitch";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const STORAGE_KEY = "mutal-feature-flags";

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  randomFriday: true,
  speedDatingMixer: true,
  aiOpenerStudio: true,
  socialMiniGames: true,
  elevatorPitch: true,
};

export function getFeatureFlags(overrides?: Partial<FeatureFlags>): FeatureFlags {
  let stored: Partial<FeatureFlags> = {};
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as Partial<FeatureFlags>;
    } catch {
      stored = {};
    }
  }
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...stored,
    ...overrides,
  };
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return getFeatureFlags()[key] ?? DEFAULT_FEATURE_FLAGS[key];
}

export function setFeatureFlagOverride(key: FeatureFlagKey, enabled: boolean): FeatureFlags {
  const next = getFeatureFlags({ [key]: enabled });
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}
