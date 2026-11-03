// Pure, client-safe helpers for "rank my matches by what I value".

export type MatchCandidate = {
  matchId: string;
  id: string;
  age: number;
  town: string;
  intent: string;
  tags: string[];
  bio: string;
  seeking: string;
};

export type RankedMatch = { matchId: string; score: number; reason: string };

export const MAX_VALUES_LENGTH = 600;
export const MAX_RANKED = 20;

/** Aliased, name-free view of each match sent to the model. */
export function toValueCandidates(list: MatchCandidate[]) {
  return list.slice(0, MAX_RANKED).map((c, i) => ({
    ref: `m${i + 1}`,
    age: c.age,
    town: c.town,
    intent: c.intent,
    interests: c.tags.slice(0, 10),
    about: c.bio.slice(0, 240),
    seeking: c.seeking.slice(0, 240),
  }));
}

/** Maps model refs back to matches, drops unknown/duplicate refs, clamps scores, sorts. */
export function validateRanking(output: unknown, list: MatchCandidate[]): RankedMatch[] {
  const items = (output as { ranking?: unknown })?.ranking;
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: RankedMatch[] = [];
  for (const item of items) {
    const ref = (item as { ref?: unknown })?.ref;
    const m = typeof ref === "string" ? /^m(\d+)$/.exec(ref) : null;
    const c = m ? list[Number(m[1]) - 1] : undefined;
    if (!c || seen.has(c.matchId)) continue;
    seen.add(c.matchId);
    const raw = Number((item as { score?: unknown }).score);
    const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;
    const reason = String((item as { reason?: unknown }).reason ?? "")
      .trim()
      .slice(0, 220);
    out.push({ matchId: c.matchId, score, reason });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Keyword-overlap fallback used when AI is unavailable. */
export function fallbackRanking(values: string, list: MatchCandidate[]): RankedMatch[] {
  const words = new Set(values.toLowerCase().match(/[a-z\u00c0-\u024f]{4,}/g) ?? []);
  return list
    .map((c) => {
      const text = `${c.tags.join(" ")} ${c.bio} ${c.seeking} ${c.intent}`.toLowerCase();
      const hits = [...words].filter((w) => text.includes(w));
      return {
        matchId: c.matchId,
        score: Math.min(100, hits.length * 20),
        reason: hits.length ? `Mentions ${hits.slice(0, 3).join(", ")}.` : "",
      };
    })
    .sort((a, b) => b.score - a.score);
}
