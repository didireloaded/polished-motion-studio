export type ThisOrThatQuestion = {
  id: string;
  title: string;
  optionA: { label: string; subtitle: string };
  optionB: { label: string; subtitle: string };
};

export const elevatorPitchPrompts = [
  "Why you should take me to Swakopmund this weekend",
  "My most controversial braai opinion",
  "The best spontaneous plan in Windhoek",
  "Our ideal Sunday morning road trip",
] as const;

export const thisOrThatQuestions: ThisOrThatQuestion[] = [
  {
    id: "kapana_biltong",
    title: "Namibian classic",
    optionA: { label: "Kapana", subtitle: "Fresh off the grill with salsa" },
    optionB: { label: "Padkos Biltong", subtitle: "Spiced & sliced for the B1" },
  },
  {
    id: "weekend_escape",
    title: "Long weekend escape",
    optionA: { label: "Beach weekend", subtitle: "Swakopmund mist & sea air" },
    optionB: { label: "Bush lodge", subtitle: "Stars & silence in Damaraland" },
  },
  {
    id: "sunday_rhythm",
    title: "Ideal pacing",
    optionA: { label: "Sunrise hike", subtitle: "Avis Dam trail + early coffee" },
    optionB: { label: "Late-night lounge", subtitle: "Live acoustic music & wine" },
  },
  {
    id: "coffee_order",
    title: "Morning ritual",
    optionA: { label: "Flat white", subtitle: "Slowtown roast, no rush" },
    optionB: { label: "Iced Rooibos", subtitle: "Sunny courtyard table" },
  },
  {
    id: "braai_role",
    title: "At the Saturday braai",
    optionA: { label: "On the tongs", subtitle: "Running the fire & timing" },
    optionB: { label: "Playlist & sides", subtitle: "Garlic bread, music & vibe" },
  },
];

export function getWindhoekDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Windhoek",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value["year"]}-${value["month"]}-${value["day"]}`;
}

export function getDailyThisOrThatQuestion(now = new Date()): ThisOrThatQuestion {
  const localDate = getWindhoekDate(now);
  const day = Math.floor(
    (Date.parse(`${localDate}T00:00:00Z`) - Date.UTC(2026, 0, 1)) / 86_400_000,
  );
  return thisOrThatQuestions[
    ((day % thisOrThatQuestions.length) + thisOrThatQuestions.length) % thisOrThatQuestions.length
  ]!;
}

export const speedDatingPrompts = [
  {
    id: "coast-vs-bush",
    category: "Rapid Debate",
    prompt:
      "Beach weekend in Swakopmund vs. Bush lodge under the stars — defend your choice in one sentence.",
  },
  {
    id: "windhoek-spots",
    category: "Local Taste",
    prompt:
      "Rank these three for a first meetup: Slowtown Coffee, Single Quarters Kapana, or Avis Dam walk.",
  },
  {
    id: "road-trip-rule",
    category: "Road Trip Check",
    prompt:
      "We have 4 hours on the road to the coast. Who controls the playlist and what’s the first snack stop?",
  },
  {
    id: "sunday-vibe",
    category: "Weekend Energy",
    prompt:
      "It’s Sunday at 4 PM in Namibia. Are we lighting a braai with friends or watching the sunset somewhere quiet?",
  },
];

export type FlagPollItem = {
  id: string;
  statement: string;
  context: string;
};

export const flagSwipePolls: FlagPollItem[] = [
  {
    id: "camping-no-signal",
    statement: "Going camping at Spitzkoppe for a weekend with zero cell reception",
    context: "Weekend habits",
  },
  {
    id: "pineapple-pizza",
    statement: "Ordering pineapple on pizza on a Friday night date",
    context: "Food opinions",
  },
  {
    id: "six-hour-text",
    statement: "Taking 6 hours to text back during a busy workday, but sending a voice note after",
    context: "Texting style",
  },
];

export const dailyHotTakePrompts = [
  {
    id: "overrated-trend",
    prompt: "What’s an overrated weekend habit in Namibia — and what should replace it?",
  },
];
