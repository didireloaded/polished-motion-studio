import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  fallbackRank,
  filterEligible,
  toModelCandidates,
  validateModelOutput,
  type MemberProfile,
  type Recommendation,
} from "./recommend";

const COLS =
  "id, display_name, age, town, bio, tags, intent, seeking, active, pref_min_age, pref_max_age, pref_town";

export type RecommendationResult = {
  source: "ai" | "fallback" | "none";
  notice?: string;
  items: (Recommendation & {
    profile: Omit<MemberProfile, "pref_min_age" | "pref_max_age" | "pref_town" | "active">;
  })[];
};

export const getRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RecommendationResult> => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("profiles")
      .select(COLS)
      .eq("id", userId)
      .maybeSingle();
    if (!me) return { source: "none", notice: "Create your profile first.", items: [] };

    // RLS already hides inactive profiles and anyone in a block with us; we re-check in code.
    const [{ data: candidates }, { data: decisions }, { data: blocks }] = await Promise.all([
      supabase.from("profiles").select(COLS).eq("active", true).neq("id", userId).limit(200),
      supabase.from("decisions").select("target_id").eq("actor_id", userId),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", userId),
    ]);
    const eligible = filterEligible(me, candidates ?? [], {
      decidedIds: (decisions ?? []).map((d) => d.target_id),
      blockedIds: (blocks ?? []).map((b) => b.blocked_id),
    }).slice(0, 40);
    if (!eligible.length) return { source: "none", items: [] };

    const hydrate = (recs: Recommendation[]) =>
      recs.map((r) => {
        const p = eligible.find((c) => c.id === r.id)!;
        return {
          ...r,
          profile: {
            id: p.id,
            display_name: p.display_name,
            age: p.age,
            town: p.town,
            bio: p.bio,
            tags: p.tags,
            intent: p.intent,
            seeking: p.seeking,
          },
        };
      });

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey)
      return {
        source: "fallback",
        notice: "AI suggestions are not configured yet; showing simple matches.",
        items: hydrate(fallbackRank(me, eligible)),
      };

    try {
      const { rankWithAi } = await import("./ai-rank.server");
      const output = await rankWithAi(apiKey, {
        me: {
          age: me.age,
          town: me.town,
          intent: me.intent,
          interests: me.tags,
          seeking: me.seeking.slice(0, 400),
        },
        candidates: toModelCandidates(eligible),
      });
      const recs = validateModelOutput(output, eligible);
      if (recs.length) return { source: "ai", items: hydrate(recs) };
      return {
        source: "fallback",
        notice: "Showing simple matches for now.",
        items: hydrate(fallbackRank(me, eligible)),
      };
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      console.error("AI ranking failed", status ?? "", err instanceof Error ? err.message : "");
      const notice =
        status === 402
          ? "AI credits have run out; showing simple matches."
          : "AI suggestions are unavailable right now; showing simple matches.";
      return { source: "fallback", notice, items: hydrate(fallbackRank(me, eligible)) };
    }
  });
