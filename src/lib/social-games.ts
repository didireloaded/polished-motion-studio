import type { Person } from "@/lib/namlink";

export type ElevatorPitch = {
  prompt: string;
  pitchText: string;
  durationSeconds: number;
  reactions: [string, string, string];
};

export type TwoTruthsItem = {
  statement: string;
  isLie: boolean;
};

export type TwoTruthsGame = {
  personId: string;
  personName: string;
  items: [TwoTruthsItem, TwoTruthsItem, TwoTruthsItem];
};

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

const presetPitches: Record<string, ElevatorPitch> = {
  amara: {
    prompt: "Why you should take me to Swakopmund this weekend",
    pitchText:
      "I pack elite padkos, know the quietest espresso spot near the jetty, and never complain when the coastal fog rolls in early.",
    durationSeconds: 26,
    reactions: [
      "I’m sold — what’s in your padkos basket?",
      "Best espresso near the jetty? Put me on!",
      "Let’s do a coast drive soon",
    ],
  },
  daniel: {
    prompt: "My most controversial braai opinion",
    pitchText:
      "Good camelthorn wood matters more than the marinade, and a toasted brötchen beats potato salad every single time.",
    durationSeconds: 24,
    reactions: [
      "Wait, defend that potato salad take!",
      "100% agree on camelthorn wood",
      "When are you hosting the next braai?",
    ],
  },
  ndapewa: {
    prompt: "Why you should take me to Swakopmund this weekend",
    pitchText:
      "Sunrise walk on the dunes, fresh oysters by noon, and a sunset debate over which Namibian town has the warmest people.",
    durationSeconds: 28,
    reactions: [
      "Dunes at sunrise sounds unbeaten",
      "Which town wins your vote?",
      "Count me in for oysters by the sea",
    ],
  },
};

export function getElevatorPitchForPerson(
  person: Pick<Person, "id" | "name" | "town" | "bio" | "answer" | "tags">,
  customPitch?: { prompt?: string; pitchText?: string },
): ElevatorPitch {
  if (customPitch?.pitchText?.trim()) {
    return {
      prompt: customPitch.prompt || elevatorPitchPrompts[0],
      pitchText: customPitch.pitchText.trim().slice(0, 160),
      durationSeconds: 25,
      reactions: [
        `Love that — tell me more about your ${person.town} routine!`,
        "Okay, you convinced me in under 30 seconds",
        "Let’s test this theory over coffee this week",
      ],
    };
  }

  const preset = presetPitches[person.id];
  if (preset) return preset;

  const topTag = person.tags[0]?.toLowerCase() ?? "good coffee";
  return {
    prompt:
      person.town === "Swakopmund" || person.town === "Walvis Bay"
        ? "Why you should join me at the coast this weekend"
        : "Why you should take me to Swakopmund this weekend",
    pitchText: `${person.answer || person.bio || `Always down for ${topTag} in ${person.town}.`} Bonus: I always know where to find the best coffee and sunset view.`,
    durationSeconds: 25,
    reactions: [
      `Tell me your go-to spot in ${person.town}!`,
      `I’m always up for ${topTag} — let’s plan it`,
      "That 30-second pitch deserves a proper hello",
    ],
  };
}

export function getTwoTruthsForPerson(
  person: Pick<Person, "id" | "name" | "town" | "tags" | "answer">,
): TwoTruthsGame {
  const tagA = person.tags[0] ?? "Road trips";
  const tagB = person.tags[1] ?? "Coffee";

  if (person.id === "amara") {
    return {
      personId: person.id,
      personName: person.name,
      items: [
        {
          statement: "I once sketched an entire building plan on a café napkin in Windhoek.",
          isLie: false,
        },
        { statement: "I’ve never eaten kapana at Single Quarters.", isLie: true },
        { statement: "I can pack for a Swakopmund road trip in under 12 minutes.", isLie: false },
      ],
    };
  }

  if (person.id === "daniel") {
    return {
      personId: person.id,
      personName: person.name,
      items: [
        {
          statement: "I drove from Swakopmund to Sossusvlei just to catch one sunrise.",
          isLie: false,
        },
        { statement: "I prefer instant coffee over a proper flat white.", isLie: true },
        {
          statement: "I know every scenic gravel detour between Windhoek and the coast.",
          isLie: false,
        },
      ],
    };
  }

  return {
    personId: person.id,
    personName: person.name,
    items: [
      {
        statement: `${tagA} in ${person.town} is my favourite way to reset after a busy week.`,
        isLie: false,
      },
      {
        statement: `I’ve never once stopped for padkos on a Namibian road trip.`,
        isLie: true,
      },
      {
        statement: `You’ll usually find me talking about ${tagB.toLowerCase()} with friends on a Sunday.`,
        isLie: false,
      },
    ],
  };
}

export function buildTwoTruthsReply(
  game: TwoTruthsGame,
  guessedIndex: number,
): {
  correct: boolean;
  replyDraft: string;
  firstTruth: string;
  lieStatement: string;
} {
  const picked = game.items[guessedIndex] ?? game.items[0];
  const firstTruth = game.items.find((item) => !item.isLie)?.statement ?? game.items[0].statement;
  const lieStatement = game.items.find((item) => item.isLie)?.statement ?? game.items[1].statement;
  const correct = picked.isLie;

  const replyDraft = correct
    ? `Gotcha! Tell me the story behind "${firstTruth}"`
    : `You fooled me on Two Truths & a Lie! Tell me the story behind "${firstTruth}"`;

  return {
    correct,
    replyDraft,
    firstTruth,
    lieStatement,
  };
}

export function getPersonThisOrThatAnswers(
  person: Pick<Person, "id" | "town" | "tags">,
): Record<string, "A" | "B"> {
  const seed = person.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const coastal = person.town === "Swakopmund" || person.town === "Walvis Bay";
  return {
    kapana_biltong: seed % 2 === 0 ? "A" : "B",
    weekend_escape: coastal ? "A" : seed % 3 === 0 ? "B" : "A",
    sunday_rhythm: person.tags.some((t) => /hiking|outdoors|fitness/i.test(t)) ? "A" : "B",
    coffee_order: person.tags.some((t) => /coffee/i.test(t)) ? "A" : seed % 2 === 0 ? "A" : "B",
    braai_role: seed % 2 === 1 ? "A" : "B",
  };
}

export function computeVibeAlignment(
  myAnswers: Record<string, string>,
  theirAnswers: Record<string, string>,
): {
  percentage: number;
  matchedCount: number;
  totalComparable: number;
  sharedHighlights: string[];
} {
  let matchedCount = 0;
  let totalComparable = 0;
  const sharedHighlights: string[] = [];

  for (const q of thisOrThatQuestions) {
    const mine = myAnswers[q.id];
    const theirs = theirAnswers[q.id];
    if (!mine || !theirs) continue;
    totalComparable += 1;
    if (mine === theirs) {
      matchedCount += 1;
      sharedHighlights.push(mine === "A" ? q.optionA.label : q.optionB.label);
    }
  }

  if (totalComparable === 0) {
    return {
      percentage: 80,
      matchedCount: 4,
      totalComparable: 5,
      sharedHighlights: ["Kapana", "Beach weekend"],
    };
  }

  const raw = Math.round((matchedCount / totalComparable) * 100);
  // Keep alignment encouraging and realistic between 40% and 100%
  const percentage = Math.max(40, Math.min(100, raw));
  return {
    percentage,
    matchedCount,
    totalComparable,
    sharedHighlights,
  };
}

export function getNextMixerWindow(now: Date = new Date()): {
  label: string;
  isLiveNow: boolean;
  minutesUntilStart: number;
} {
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours();
  if (day === 0 && hour === 20) {
    return {
      label: "Live now · Sunday 8 PM Mixer",
      isLiveNow: true,
      minutesUntilStart: 0,
    };
  }
  return {
    label: "Sunday 8 PM Windhoek & Coast Mixer · Preview room open",
    isLiveNow: false,
    minutesUntilStart: 15,
  };
}

export type FirstDateDilemma = {
  id: string;
  town: string;
  prompt: string;
  optionA: { label: string; venueHint: string };
  optionB: { label: string; venueHint: string };
  partnerPick: "A" | "B";
};

export function getFirstDateDilemmaForTown(
  town: string = "Windhoek",
  partnerId: string = "amara",
): FirstDateDilemma {
  const pick: "A" | "B" = partnerId.charCodeAt(0) % 2 === 0 ? "A" : "B";
  if (town === "Swakopmund" || town === "Walvis Bay") {
    return {
      id: "coast-dilemma",
      town,
      prompt: "First Date Dilemma · Would you rather…",
      optionA: {
        label: "Sunset walk along the Swakopmund Jetty",
        venueHint: "Followed by warm espresso or glühwein",
      },
      optionB: {
        label: "Morning dune climb at Dune 7 + iced coffee",
        venueHint: "Sandboard down or just enjoy the view",
      },
      partnerPick: pick,
    };
  }

  return {
    id: "whk-dilemma",
    town: town || "Windhoek",
    prompt: "First Date Dilemma · Would you rather…",
    optionA: {
      label: "Street food & kapana crawl in Katutura",
      venueHint: "Casual, lively & zero dress-code pressure",
    },
    optionB: {
      label: "Golden-hour picnic walk at Avis Dam",
      venueHint: "Quiet trail + sunset view over the hills",
    },
    partnerPick: pick,
  };
}

export type EmojiStoryPuzzle = {
  emojis: string;
  options: [string, string, string];
  correctIndex: number;
  explanation: string;
};

export function getEmojiStoryForPerson(
  person: Pick<Person, "id" | "name" | "town">,
): EmojiStoryPuzzle {
  if (person.town === "Swakopmund" || person.town === "Walvis Bay") {
    return {
      emojis: "🌫️☕🌊🦭🌅",
      options: [
        "Morning mist coffee, Pelican Point seals & coastal sunset",
        "Climbing Mount Kilimanjaro in winter",
        "Late-night clubbing in Berlin",
      ],
      correctIndex: 0,
      explanation: `My ideal ${person.town} Saturday from sunrise to sunset!`,
    };
  }

  return {
    emojis: "🚗🏜️🔥🥩🌌",
    options: [
      "Road trip to Spitzkoppe, camelthorn braai & stargazing",
      "Stuck in traffic on Independence Avenue",
      "Running a marathon in the desert at noon",
    ],
    correctIndex: 0,
    explanation: "Give me padkos, a campfire, and a clear Namibian night sky!",
  };
}

export type FlagPollItem = {
  id: string;
  statement: string;
  context: string;
  greenFlagPct: number;
  town: string;
};

export const flagSwipePolls: FlagPollItem[] = [
  {
    id: "camping-no-signal",
    statement: "Going camping at Spitzkoppe for a weekend with zero cell reception",
    context: "Weekend habits",
    greenFlagPct: 82,
    town: "Windhoek",
  },
  {
    id: "pineapple-pizza",
    statement: "Ordering pineapple on pizza on a Friday night date",
    context: "Food opinions",
    greenFlagPct: 58,
    town: "Swakopmund",
  },
  {
    id: "six-hour-text",
    statement: "Taking 6 hours to text back during a busy workday, but sending a voice note after",
    context: "Texting style",
    greenFlagPct: 74,
    town: "Windhoek",
  },
];

export const dailyHotTakePrompts = [
  {
    id: "overrated-trend",
    prompt: "What’s an overrated weekend habit in Namibia — and what should replace it?",
    sampleTakes: [
      {
        author: "Amara, 26",
        town: "Windhoek",
        quip: "Loud lounges where you can’t hear each other talk. Give me a sunset walk at Avis Dam + coffee instead.",
      },
      {
        author: "Daniel, 29",
        town: "Swakopmund",
        quip: "Rushing the B1 drive without stopping for padkos and biltong in Okahandja.",
      },
    ],
  },
];

export type TriviaQuestion = {
  id: string;
  question: string;
  options: [string, string, string];
  correctIndex: number;
  teammatePickIndex: number;
};

export const namibiaTriviaQuestions: TriviaQuestion[] = [
  {
    id: "q1",
    question: "Which Namibian desert is widely considered the oldest desert in the world?",
    options: ["The Namib Desert", "The Kalahari Desert", "The Richtersveld"],
    correctIndex: 0,
    teammatePickIndex: 0,
  },
  {
    id: "q2",
    question: "Where do the towering dunes meet the Atlantic Ocean along the central coast?",
    options: ["Sandwich Harbour", "Waterberg Plateau", "Epupa Falls"],
    correctIndex: 0,
    teammatePickIndex: 0,
  },
  {
    id: "q3",
    question: "What’s the traditional seasoning spice mix served alongside fresh Kapana?",
    options: ["Chilli & salt spice mix + tomato-onion salsa", "Sweet maple glaze", "Wasabi paste"],
    correctIndex: 0,
    teammatePickIndex: 0,
  },
];
