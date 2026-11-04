export const PITCH_STYLES = ["warm", "playful", "confident", "storyteller"] as const;
export type PitchStyle = (typeof PITCH_STYLES)[number];

export const PITCH_STYLE_LABELS: Record<PitchStyle, { label: string; hint: string }> = {
  warm: { label: "Warm & genuine", hint: "Approachable, grounded, and easy to talk to" },
  playful: { label: "Playful banter", hint: "Light, witty, and full of weekend energy" },
  confident: {
    label: "Bold & direct",
    hint: "Clear about what you love and what you're looking for",
  },
  storyteller: { label: "Story-driven", hint: "Paints a quick scene of a weekend in Namibia" },
};

export type PitchProfileInput = {
  displayName: string;
  age: number;
  town: string;
  intent: string;
  tags: string[];
  bio: string;
  seeking: string;
};

export type DraftedRandomFridayPitch = {
  headline: string;
  pitch: string;
  closingHook: string;
  estimatedSeconds: number;
};

export const MAX_PITCH_CUSTOM_NOTE_LENGTH = 140;

export function toPitchPromptInput(
  profile: PitchProfileInput,
  style: PitchStyle,
  focusHint?: string,
) {
  return {
    style,
    memberProfile: {
      displayName: profile.displayName.trim().slice(0, 40) || "Member",
      age: Math.min(99, Math.max(18, Math.round(profile.age || 25))),
      town: profile.town.trim().slice(0, 40) || "Windhoek",
      intent: profile.intent.trim().slice(0, 40) || "A relationship",
      interests: profile.tags.slice(0, 8).map((t) => t.trim().slice(0, 32)),
      bio: profile.bio.trim().slice(0, 320),
      seeking: profile.seeking.trim().slice(0, 240),
    },
    ...(focusHint?.trim()
      ? { focusHint: focusHint.trim().slice(0, MAX_PITCH_CUSTOM_NOTE_LENGTH) }
      : {}),
  };
}

export function estimateSpokenSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Average conversational speaking pace is ~2.3 words per second
  return Math.min(30, Math.max(12, Math.round(words / 2.3)));
}

export function validatePitchOutput(raw: string): DraftedRandomFridayPitch | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DraftedRandomFridayPitch>;
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.pitch !== "string" ||
      typeof parsed.closingHook !== "string"
    ) {
      return null;
    }
    const headline = parsed.headline.trim().slice(0, 90);
    const pitch = parsed.pitch.trim().slice(0, 420);
    const closingHook = parsed.closingHook.trim().slice(0, 140);
    if (headline.length < 4 || pitch.length < 25 || closingHook.length < 6) {
      return null;
    }
    return {
      headline,
      pitch,
      closingHook,
      estimatedSeconds: estimateSpokenSeconds(`${pitch} ${closingHook}`),
    };
  } catch {
    return null;
  }
}

export function fallbackRandomFridayPitch(
  profile: PitchProfileInput,
  style: PitchStyle,
  focusHint?: string,
): DraftedRandomFridayPitch {
  const name = profile.displayName.trim() || "Alex";
  const town = profile.town.trim() || "Windhoek";
  const topInterests =
    profile.tags.length > 0
      ? profile.tags.slice(0, 3).join(", ").toLowerCase()
      : "good coffee and road trips";
  const intent = (profile.intent || "a real connection").toLowerCase();
  const focusClause = focusHint?.trim() ? ` Especially excited about ${focusHint.trim()}.` : "";

  const templates: Record<PitchStyle, DraftedRandomFridayPitch> = {
    warm: {
      headline: `${name} · ${town} · ${profile.intent || "A relationship"}`,
      pitch: `Hey, I'm ${name} in ${town}. My week is a mix of ${topInterests}, and I'm here looking for ${intent} with someone who enjoys unhurried conversations and spontaneous weekend plans.${focusClause}`,
      closingHook: `What's one small thing that always makes your weekend in ${town} better?`,
      estimatedSeconds: 24,
    },
    playful: {
      headline: `30 seconds with ${name} from ${town}`,
      pitch: `Okay, 30 seconds on the clock—I'm ${name} in ${town}, powered by ${topInterests}, and looking for ${intent}.${focusClause} I promise good playlists, zero dry texting, and a proper opinion on the best sunset spot in town.`,
      closingHook: `Quick—beach drive to the coast or sunset drinks in ${town}?`,
      estimatedSeconds: 26,
    },
    confident: {
      headline: `${name}, ${profile.age} · ${town}`,
      pitch: `I'm ${name} in ${town}. I value consistency, curiosity, and making time for ${topInterests}. I'm on Mutal for ${intent} with someone who knows what they enjoy and loves exploring Namibia together.${focusClause}`,
      closingHook: `Tell me what you're most looking forward to this month.`,
      estimatedSeconds: 25,
    },
    storyteller: {
      headline: `A Saturday in ${town} with ${name}`,
      pitch: `Picture a slow Saturday in ${town}: starting with ${topInterests}, no rush on the clock, and ending somewhere with a great view. I'm ${name}, and I'm looking for ${intent} with someone who turns simple plans into great stories.${focusClause}`,
      closingHook: `Where would we go first if we had this Saturday free?`,
      estimatedSeconds: 27,
    },
  };

  const selected = templates[style];
  return {
    ...selected,
    estimatedSeconds: estimateSpokenSeconds(`${selected.pitch} ${selected.closingHook}`),
  };
}

export function formatShareablePitchCard(
  profile: PitchProfileInput,
  draft: DraftedRandomFridayPitch,
): string {
  const tagsLine = profile.tags.length
    ? `Interests: ${profile.tags.slice(0, 5).join(" · ")}\n`
    : "";
  return (
    `${draft.headline}\n` + `${tagsLine}` + `"${draft.pitch}"\n` + `Ask me: ${draft.closingHook}`
  );
}
