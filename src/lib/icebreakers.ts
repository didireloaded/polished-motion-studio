// Pure, client-safe helpers for Namibian icebreakers, local date spots, prompts, and haptics.

export type IcebreakerContext = {
  name?: string;
  town?: string;
  tags?: string[];
  intent?: string;
  bio?: string;
  prompt?: string;
  answer?: string;
};

export const namibianPrompts = [
  "My ideal weekend in Swakopmund",
  "Best biltong or kapana spot in town",
  "Camping under the stars at Spitzkoppe",
  "Beach sunset at Long Beach or desert sunrise?",
  "My go-to Namibia road trip snack",
  "The way to my heart is",
] as const;

export const localDateSpots: Record<string, { activity: string; venue: string }[]> = {
  Windhoek: [
    { activity: "Morning coffee & pastries", venue: "Slowtown Coffee Roasters" },
    { activity: "Sundowners on the terrace", venue: "The Stellenbosch Wine Bar" },
    { activity: "Weekend market & street food", venue: "The Village Courtyard" },
    { activity: "Scenic afternoon trail walk", venue: "Daan Viljoen Game Park" },
  ],
  Swakopmund: [
    { activity: "Sunset drinks by the jetty", venue: "The Tug Restaurant" },
    { activity: "Craft beer & ocean view", venue: "Brewer & Butcher" },
    { activity: "Slow coffee & coastal walk", venue: "Village Cafe" },
    { activity: "Golden hour beach walk", venue: "Long Beach" },
  ],
  "Walvis Bay": [
    { activity: "Sunrise climb & coffee", venue: "Dune 7" },
    { activity: "Lagoon walk to see the flamingos", venue: "Walvis Bay Waterfront" },
    { activity: "Fresh fish & harbour views", venue: "Anchors @ the Jetty" },
  ],
  Oshakati: [
    { activity: "Fresh kapana & cold drinks", venue: "Oshakati Open Market" },
    { activity: "Afternoon coffee catch-up", venue: "Oshakati Town Centre" },
  ],
  Otjiwarongo: [
    { activity: "Coffee & homemade cake", venue: "Hadassa Guest House Cafe" },
    { activity: "Morning nature walk", venue: "Waterberg Plateau foothills" },
  ],
  Rundu: [
    { activity: "Sunset view over the river", venue: "Kavango River Waterfront" },
    { activity: "Relaxed afternoon coffee", venue: "Central Rundu Cafe" },
  ],
};

const townIcebreakers: Record<string, string> = {
  Windhoek: "What’s your favourite coffee or sundowner spot in Windhoek?",
  Swakopmund: "Beach walk at Long Beach or coffee in town — what’s your ideal Swakop weekend?",
  "Walvis Bay": "Sunset by the lagoon or an early start at Dune 7?",
  Oshakati: "Where do you go for the best kapana in Oshakati?",
  Otjiwarongo: "What’s your favourite weekend road trip from Otjiwarongo?",
  Rundu: "What’s your favourite spot along the river in Rundu?",
};

const tagIcebreakers: Record<string, string> = {
  Coffee: "What’s your go-to coffee order when you have a slow morning?",
  "Road trips": "What’s at the top of your Namibia road trip bucket list right now?",
  "Live music": "What’s the best live music evening you’ve been to lately?",
  Hiking: "Do you have a favourite trail or outdoor spot for a free Saturday?",
  "Art & design": "What’s been inspiring you creatively lately?",
  Food: "If we’re grabbing a bite, what’s a spot you always recommend?",
  "Beach days": "Are you team ocean swim or team slow walk on the beach?",
  Photography: "What’s your favourite place in Namibia to take photos?",
  Amapiano: "What song is guaranteed to get you on the dance floor?",
  Camping: "Camping under the stars at Spitzkoppe or a cosy guesthouse by the coast?",
};

/** Generates 3 warm, Namibia-grounded conversation starters tailored to a match. */
export function generateIcebreakers(ctx: IcebreakerContext): string[] {
  const results: string[] = [];
  const add = (text: string) => {
    const clean = text.trim();
    if (clean && !results.includes(clean) && results.length < 3) {
      results.push(clean);
    }
  };

  for (const tag of ctx.tags ?? []) {
    const byTag = tagIcebreakers[tag];
    if (byTag) add(byTag);
  }

  if (ctx.town && townIcebreakers[ctx.town]) {
    add(townIcebreakers[ctx.town]!);
  }

  if (ctx.prompt && ctx.answer) {
    add(`I loved your note about "${ctx.prompt.toLowerCase()}" — tell me more!`);
  }

  if (ctx.intent) {
    add(`Hey${ctx.name ? ` ${ctx.name}` : ""}! What does your ideal weekend look like lately?`);
  }

  const defaults = [
    "What’s your go-to road trip snack when heading out of town?",
    "Beach sunset at the coast or desert sunrise?",
    "What’s been the highlight of your week so far?",
  ];
  for (const fallback of defaults) {
    add(fallback);
  }

  return results.slice(0, 3);
}

/** Triggers a subtle Web Vibration API pulse on supported mobile browsers. */
export function triggerHaptic(pattern: number | number[] = 15) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported environments.
  }
}
