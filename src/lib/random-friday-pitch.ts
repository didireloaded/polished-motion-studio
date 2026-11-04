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
  return Math.max(1, Math.ceil((words * 10) / 23));
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
    const headline = parsed.headline.trim();
    const pitch = parsed.pitch.trim();
    const closingHook = parsed.closingHook.trim();
    if (
      headline.length < 4 ||
      headline.length > 90 ||
      pitch.length < 25 ||
      pitch.length > 600 ||
      closingHook.length < 6 ||
      closingHook.length > 140 ||
      estimateSpokenSeconds(`${pitch} ${closingHook}`) > 30
    ) {
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
  const words = (text: string, limit: number) => text.trim().split(/\s+/).slice(0, limit).join(" ");
  const name = words(profile.displayName, 5) || "Member";
  const town = words(profile.town, 4) || "my town";
  const intent = words(profile.intent, 6) || "a connection";
  const tags = profile.tags
    .slice(0, 2)
    .map((tag) => words(tag, 4))
    .filter(Boolean);
  const openings: Record<PitchStyle, string> = {
    warm: `Hi, I'm ${name}.`,
    playful: `A quick introduction: I'm ${name}.`,
    confident: `I'm ${name}.`,
    storyteller: `A little about me: I'm ${name}.`,
  };
  let pitch = `${openings[style]} I live in ${town} and I'm looking for ${intent.toLowerCase()}.`;
  if (tags.length) pitch += ` I enjoy ${tags.join(" and ").toLowerCase()}.`;
  const closingHook = "What do you enjoy doing on a free weekend?";
  const details = [
    focusHint?.trim() ? `I'd like to talk about ${focusHint.trim()}.` : "",
    profile.bio
      .trim()
      .match(/^[^.!?]+[.!?](?:\s|$)/)?.[0]
      ?.trim() ?? profile.bio.trim(),
  ];
  for (const detail of details) {
    const candidate = `${pitch} ${detail}`.trim();
    if (detail && estimateSpokenSeconds(`${candidate} ${closingHook}`) <= 30) pitch = candidate;
  }
  return {
    headline: `${name} · ${town}`,
    pitch,
    closingHook,
    estimatedSeconds: estimateSpokenSeconds(`${pitch} ${closingHook}`),
  };
}

export function formatShareablePitchCard(
  profile: PitchProfileInput,
  draft: DraftedRandomFridayPitch,
): string {
  return [
    `${profile.displayName}, ${profile.age} · ${profile.town}`,
    `Looking for: ${profile.intent}`,
    profile.tags.length ? `Interests: ${profile.tags.slice(0, 5).join(" · ")}` : "",
    profile.bio.trim(),
    "",
    "My Random Friday introduction",
    draft.pitch,
    draft.closingHook,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
