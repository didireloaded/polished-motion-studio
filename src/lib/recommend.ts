// Pure, client-safe helpers for match recommendations. Used by the server
// function and covered by unit tests.

export type MemberProfile = {
  id: string;
  display_name: string;
  age: number;
  town: string;
  bio: string;
  tags: string[];
  intent: string;
  seeking: string;
  active: boolean;
  pref_min_age: number | null;
  pref_max_age: number | null;
  pref_town: string | null;
  voice_intro_path?: string | null;
};

export type Recommendation = { id: string; reason: string };

/** Filters candidates before any ranking. Blocks apply in both directions. */
export function filterEligible(
  me: MemberProfile,
  candidates: MemberProfile[],
  opts: { decidedIds: Iterable<string>; blockedIds: Iterable<string> },
): MemberProfile[] {
  const decided = new Set(opts.decidedIds);
  const blocked = new Set(opts.blockedIds);
  const minAge = me.pref_min_age ?? 18;
  const maxAge = me.pref_max_age ?? 99;
  return candidates.filter((c) => {
    if (c.id === me.id || !c.active) return false;
    if (blocked.has(c.id) || decided.has(c.id)) return false;
    if (c.age < Math.max(18, minAge) || c.age > maxAge) return false;
    if (me.pref_town && c.town !== me.pref_town) return false;
    // Respect the candidate's own stated preferences too.
    if (c.pref_min_age != null && me.age < c.pref_min_age) return false;
    if (c.pref_max_age != null && me.age > c.pref_max_age) return false;
    if (c.pref_town && c.pref_town !== me.town) return false;
    return true;
  });
}

/** Minimal fields sent to the model: alias, no names or ids. */
export function toModelCandidates(list: MemberProfile[]) {
  return list.map((c, i) => ({
    ref: `c${i + 1}`,
    age: c.age,
    town: c.town,
    intent: c.intent,
    interests: c.tags.slice(0, 10),
    seeking: c.seeking.slice(0, 240),
    about: c.bio.slice(0, 240),
  }));
}

/** Keeps only refs that map to eligible candidates; dedupes; trims reasons. */
export function validateModelOutput(
  output: unknown,
  eligible: MemberProfile[],
  limit = 5,
): Recommendation[] {
  const items = (output as { recommendations?: unknown })?.recommendations;
  if (!Array.isArray(items)) return [];
  const byRef = new Map(eligible.map((c, i) => [`c${i + 1}`, c.id]));
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const item of items) {
    const ref = (item as { ref?: unknown })?.ref;
    const reason = (item as { reason?: unknown })?.reason;
    if (typeof ref !== "string" || typeof reason !== "string") continue;
    const id = byRef.get(ref);
    if (!id || seen.has(id) || !reason.trim()) continue;
    seen.add(id);
    out.push({ id, reason: reason.trim().slice(0, 160) });
    if (out.length >= limit) break;
  }
  return out;
}

/** Deterministic fallback: shared interests, same town, same intent. */
export function fallbackRank(
  me: MemberProfile,
  eligible: MemberProfile[],
  limit = 5,
): Recommendation[] {
  return eligible
    .map((c) => {
      const shared = c.tags.filter((t) => me.tags.includes(t));
      const score =
        shared.length * 2 + (c.town === me.town ? 2 : 0) + (c.intent === me.intent ? 1 : 0);
      const bits: string[] = [];
      if (shared.length)
        bits.push(`You both enjoy ${shared.slice(0, 2).join(" and ").toLowerCase()}`);
      if (c.town === me.town) bits.push(`also in ${c.town}`);
      if (c.intent === me.intent) bits.push(`also looking for ${c.intent.toLowerCase()}`);
      return {
        id: c.id,
        score,
        reason: bits.length
          ? capitalize(bits.join(", ")) + "."
          : `Based in ${c.town}, looking for ${c.intent.toLowerCase()}.`,
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(({ id, reason }) => ({ id, reason }));
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
