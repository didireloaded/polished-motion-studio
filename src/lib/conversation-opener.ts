// Pure, client-safe helpers for drafting a personalized conversation opener by tone.

export const OPENER_TONES = ["warm", "playful", "curious", "direct"] as const;
export type OpenerTone = (typeof OPENER_TONES)[number];

export const OPENER_TONE_LABELS: Record<OpenerTone, { label: string; description: string }> = {
  warm: {
    label: "Warm & genuine",
    description: "Kind, relaxed, and easy to reply to",
  },
  playful: {
    label: "Playful & witty",
    description: "Lighthearted energy with a gentle spark",
  },
  curious: {
    label: "Curious & thoughtful",
    description: "Asks an engaging question about their world",
  },
  direct: {
    label: "Direct & low-pressure",
    description: "Clear intention without endless small talk",
  },
};

export type OpenerProfileInput = {
  town: string;
  intent: string;
  tags: string[];
  bio: string;
  seeking: string;
};

export type DraftedOpener = {
  opener: string;
  followUpTopic: string;
  whyItWorks: string;
};

export const MAX_OPENER_NOTE_LENGTH = 200;

/**
 * Produces an anonymized, identifier-free representation of the match's profile
 * and the member's chosen tone to send to AI Gateway.
 */
export function toOpenerPromptInput(
  profile: OpenerProfileInput,
  tone: OpenerTone,
  customNote?: string,
) {
  return {
    tone,
    toneDescription: OPENER_TONE_LABELS[tone].description,
    matchProfile: {
      town: profile.town.trim().slice(0, 60),
      intent: profile.intent.trim().slice(0, 80),
      interests: profile.tags.slice(0, 10).map((t) => t.trim().slice(0, 40)),
      about: profile.bio.trim().slice(0, 260),
      seeking: profile.seeking.trim().slice(0, 240),
    },
    ...(customNote?.trim()
      ? { focusHint: customNote.trim().slice(0, MAX_OPENER_NOTE_LENGTH) }
      : {}),
  };
}

/** Validates and bounds the structured JSON response from the model. */
export function validateOpenerOutput(output: unknown): DraftedOpener | null {
  if (!output || typeof output !== "object") return null;
  const raw = output as {
    opener?: unknown;
    followUpTopic?: unknown;
    whyItWorks?: unknown;
  };
  const opener = typeof raw.opener === "string" ? raw.opener.trim().slice(0, 280) : "";
  if (opener.length < 8) return null;
  const followUpTopic =
    typeof raw.followUpTopic === "string" ? raw.followUpTopic.trim().slice(0, 140) : "";
  const whyItWorks = typeof raw.whyItWorks === "string" ? raw.whyItWorks.trim().slice(0, 180) : "";
  return { opener, followUpTopic, whyItWorks };
}

/** Deterministic tone-aware fallback used when AI Gateway is unavailable or in offline preview. */
export function fallbackConversationOpener(
  profile: OpenerProfileInput,
  tone: OpenerTone,
  customNote?: string,
): DraftedOpener {
  const town = profile.town.trim() || "Namibia";
  const topInterest = profile.tags[0]?.toLowerCase() || "good coffee";
  const secondInterest = profile.tags[1]?.toLowerCase() || "weekend plans";
  const focus = customNote?.trim();

  if (tone === "playful") {
    return {
      opener: focus
        ? `Important question before we get too far: how does ${focus.toLowerCase()} rank alongside ${topInterest} in ${town}?`
        : `Quick ${town} tie-breaker: if we have a free Saturday, is ${topInterest} or ${secondInterest} winning the vote?`,
      followUpTopic: `Compare favourite spots in ${town}`,
      whyItWorks: `Uses a light two-choice question grounded in ${topInterest} so replying feels effortless.`,
    };
  }

  if (tone === "curious") {
    return {
      opener: focus
        ? `Your profile caught my eye — especially around ${focus}. What got you into ${topInterest} in ${town}?`
        : `I loved reading your profile. Between ${topInterest} and ${secondInterest}, which one has the better story behind it?`,
      followUpTopic: `Ask about their experience with ${topInterest}`,
      whyItWorks: `Invites a personal story about ${topInterest} rather than a yes/no answer.`,
    };
  }

  if (tone === "direct") {
    return {
      opener: focus
        ? `Hey! I really liked what you shared and noticed we’re both into ${topInterest} (${focus}). Would love to chat and see if we click.`
        : `Hey! We both seem to appreciate ${topInterest} and a ${profile.intent.toLowerCase() || "genuine"} connection in ${town} — how’s your week going?`,
      followUpTopic: `Suggest a relaxed coffee or walk in ${town}`,
      whyItWorks: `Clear, respectful, and references shared intention and ${topInterest}.`,
    };
  }

  // Default: "warm"
  return {
    opener: focus
      ? `Hey! Your note and love for ${topInterest} in ${town} stood out to me (${focus}). What does a great weekend look like for you lately?`
      : `Hey! It’s great matching with you — fellow ${topInterest} fan in ${town} here. What’s been the highlight of your week so far?`,
    followUpTopic: `Share your own favourite ${topInterest} memory in ${town}`,
    whyItWorks: `Warm, grounded in ${town} and ${topInterest}, and leaves an open door to reply.`,
  };
}
