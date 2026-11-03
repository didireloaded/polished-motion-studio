import { isFeatureEnabled } from "@/lib/feature-flags";

export { RandomFridayBanner, RandomFridayModal } from "@/components/RandomFridayModal";
export {
  applyChemistryBonus,
  applyReactionBoost,
  BINARY_DILEMMAS,
  CHEMISTRY_BONUS_SECONDS,
  CHEMISTRY_WINDOW_SECONDS,
  createRoundTimerState,
  getRandomFridayStatus,
  HOLD_TO_STAY_MS,
  ICEBREAKER_WHEEL_PROMPTS,
  pickRandomPartner,
  RANDOM_FRIDAY_DURATION_SECONDS,
  RANDOM_FRIDAY_ELEVATOR_LINES,
  REACTION_BOOST_SECONDS,
  spinIcebreakerWheel,
  type BinaryDilemma,
  type RandomFridayStatus,
  type ReactionEmoji,
  type RoundTimerState,
} from "@/lib/random-friday";

/** Throttled presence heartbeat interval (4 seconds) to conserve mobile radio & battery. */
export const PRESENCE_HEARTBEAT_MS = 4000;

export function isRandomFridayEnabled(): boolean {
  return isFeatureEnabled("randomFriday");
}
