// Pure scheduling, countdown, and prompt helpers for "Random Friday" (Friday 10:00–11:00 AM local time).

export type RandomFridayWindowState = {
  status: "live" | "starting_soon" | "countdown";
  isLiveWindow: boolean;
  daysUntil: number;
  hoursUntil: number;
  minutesUntil: number;
  secondsRemainingInHour: number;
  headline: string;
  subheadline: string;
};

export const RANDOM_FRIDAY_DURATION_SECONDS = 30;
export const INSTANT_CHEMISTRY_BONUS_SECONDS = 15;
export const REACTION_BOOST_SECONDS = 3;
export const MAX_REACTION_BOOSTS = 3;

export const randomFridayElevatorLines = [
  "Tell me your favorite weekend spot in 5 seconds!",
  "Two truths, one lie—go!",
  "Voice memo pitch: best coffee + road trip playlist in Namibia!",
] as const;

export const randomFridayDicePrompts = [
  "Sell me on your city in 5 words.",
  "Rank: Kapana, Biltong, or Pizza?",
  "What are your plans tonight if we match?",
  "Best road-trip song when driving to Swakopmund?",
] as const;

export const randomFridayBinaryTapCards = [
  {
    id: "hours",
    prompt: "Agree or Fight: Your best energy is…",
    left: "Early mornings",
    right: "3 AM nights",
  },
  {
    id: "weather",
    prompt: "Agree or Fight: Better Namibian vibe…",
    left: "Swakopmund mist",
    right: "Windhoek sun",
  },
  {
    id: "meetup",
    prompt: "Agree or Fight: First meetup style…",
    left: "Spontaneous coffee",
    right: "Planned dinner",
  },
] as const;

export function shouldUnblurMysteryPhoto(secondsLeft: number, myMessagesSent: number): boolean {
  return myMessagesSent >= 1 || secondsLeft <= 15;
}

export function applyTimeBoost(
  currentSeconds: number,
  boostSeconds: number,
  maxCap: number = 60,
): number {
  return Math.max(0, Math.min(maxCap, currentSeconds + boostSeconds));
}

export const randomFridayPartnerPrompts: Record<string, string> = {
  amara: "Convince me why our first coffee shouldn’t wait until next week.",
  daniel: "30 seconds on the clock: beach drive to Swakopmund or sunset braai in Windhoek?",
  ndapewa: "Give me your best controversial Namibian food opinion in one sentence!",
};

export function getRandomFridayState(now: Date = new Date()): RandomFridayWindowState {
  const day = now.getDay(); // 5 = Friday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  // Live window: Friday 10:00:00 – 10:59:59
  if (day === 5 && hour === 10) {
    const secondsRemainingInHour = (59 - minute) * 60 + (60 - second);
    return {
      status: "live",
      isLiveWindow: true,
      daysUntil: 0,
      hoursUntil: 0,
      minutesUntil: 0,
      secondsRemainingInHour,
      headline: "ENTER RANDOM FRIDAY (10:00 – 11:00)",
      subheadline: `${Math.ceil(secondsRemainingInHour / 60)}m left in today’s live 30-second sprint`,
    };
  }

  // Starting soon: Friday 09:45 – 09:59
  if (day === 5 && hour === 9 && minute >= 45) {
    const minsLeft = 60 - minute;
    return {
      status: "starting_soon",
      isLiveWindow: false,
      daysUntil: 0,
      hoursUntil: 0,
      minutesUntil: minsLeft,
      secondsRemainingInHour: 0,
      headline: `Random Friday starts in ${minsLeft}m! Get ready`,
      subheadline: "Friday 10:00 – 11:00 AM · 30-second live 1-on-1 pitch rounds",
    };
  }

  // Compute next Friday 10:00:00 local time
  const nextFriday = new Date(now);
  let daysToAdd = (5 - day + 7) % 7;
  if (daysToAdd === 0 && (hour > 10 || (hour === 10 && minute >= 60))) {
    daysToAdd = 7;
  }
  nextFriday.setDate(now.getDate() + daysToAdd);
  nextFriday.setHours(10, 0, 0, 0);

  const diffMs = Math.max(0, nextFriday.getTime() - now.getTime());
  const totalMinutes = Math.ceil(diffMs / 60_000);
  const daysUntil = Math.floor(totalMinutes / (60 * 24));
  const hoursUntil = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutesUntil = totalMinutes % 60;

  const countdownParts: string[] = [];
  if (daysUntil > 0) countdownParts.push(`${daysUntil} day${daysUntil === 1 ? "" : "s"}`);
  if (hoursUntil > 0 || daysUntil > 0)
    countdownParts.push(`${hoursUntil} hour${hoursUntil === 1 ? "" : "s"}`);
  if (daysUntil === 0 && minutesUntil > 0) countdownParts.push(`${minutesUntil}m`);

  return {
    status: "countdown",
    isLiveWindow: false,
    daysUntil,
    hoursUntil,
    minutesUntil,
    secondsRemainingInHour: 0,
    headline: `Next Random Friday in ${countdownParts.join(", ") || "moments"}`,
    subheadline: "Every Friday 10:00 – 11:00 AM · 30s to pitch, Stay to match",
  };
}
