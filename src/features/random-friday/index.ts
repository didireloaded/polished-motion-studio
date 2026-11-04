import { isFeatureEnabled } from "@/lib/feature-flags";

export {
  applyTimeBoost,
  getRandomFridayState,
  INSTANT_CHEMISTRY_BONUS_SECONDS,
  MAX_REACTION_BOOSTS,
  RANDOM_FRIDAY_DURATION_SECONDS,
  randomFridayBinaryTapCards,
  randomFridayDicePrompts,
  randomFridayElevatorLines,
  REACTION_BOOST_SECONDS,
  shouldUnblurMysteryPhoto,
  type RandomFridayWindowState,
} from "@/lib/random-friday";

export const PRESENCE_HEARTBEAT_MS = 4000;

export function isRandomFridayEnabled(): boolean {
  return isFeatureEnabled("randomFriday");
}
