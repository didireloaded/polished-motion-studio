import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  castFeedPollVoteSchema,
  joinLiveQueueSchema,
  liveRoundDecisionSchema,
  normalizeOrderedPair,
  saveProfileGameCardSchema,
  submitChatGameChoiceSchema,
  tallyPollVotes,
} from "./social-backend";

// Untyped helper for new Lovable Cloud tables added in migration 0011
function untypedDb(supabase: unknown): SupabaseClient {
  return supabase as SupabaseClient;
}

export const joinLiveQueueServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(joinLiveQueueSchema)
  .handler(async ({ context, data }) => {
    const db = untypedDb(context.supabase);
    const { userId } = context;
    const normalizedTown = data.town === "All" ? "Windhoek" : data.town;

    try {
      await db.from("random_friday_queue").upsert(
        {
          user_id: userId,
          town: normalizedTown,
          mode: data.mode,
          status: "waiting",
          streak_count: data.streakCount,
          last_heartbeat_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      const cutoff = new Date(Date.now() - 30_000).toISOString();
      const { data: activeRows } = await db
        .from("random_friday_queue")
        .select("user_id,town,streak_count,last_heartbeat_at")
        .eq("mode", data.mode)
        .eq("status", "waiting")
        .gte("last_heartbeat_at", cutoff)
        .neq("user_id", userId)
        .limit(20);

      return {
        ok: true,
        activeQueueCount: (activeRows?.length ?? 0) + 1,
        waitingPartnerIds: (activeRows ?? []).map((row: { user_id: string }) => row.user_id),
      };
    } catch {
      return { ok: false, activeQueueCount: 1, waitingPartnerIds: [] as string[] };
    }
  });

export const submitLiveRoundDecisionServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(liveRoundDecisionSchema)
  .handler(async ({ context, data }) => {
    const db = untypedDb(context.supabase);
    const { userId } = context;
    const { user_a, user_b, amUserA } = normalizeOrderedPair(userId, data.partnerId);

    try {
      // Also record in core decisions table when the user chooses 'stay'
      if (data.decision === "stay") {
        await context.supabase.from("decisions").upsert(
          {
            actor_id: userId,
            target_id: data.partnerId,
            liked: true,
          },
          { onConflict: "actor_id,target_id" },
        );
      }

      const updateFields = amUserA
        ? {
            user_a_decision: data.decision,
            ...(data.messageSent ? { user_a_message: data.messageSent } : {}),
            bonus_seconds: data.bonusSeconds,
          }
        : {
            user_b_decision: data.decision,
            ...(data.messageSent ? { user_b_message: data.messageSent } : {}),
            bonus_seconds: data.bonusSeconds,
          };

      const { data: existingSession } = await db
        .from("random_friday_sessions")
        .select("id,user_a_decision,user_b_decision,matched_at,chemistry_unlocked")
        .eq("user_a", user_a)
        .eq("user_b", user_b)
        .eq("mode", data.mode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession?.id) {
        const { data: updated } = await db
          .from("random_friday_sessions")
          .update(updateFields)
          .eq("id", existingSession.id)
          .select("id,matched_at,chemistry_unlocked,user_a_decision,user_b_decision")
          .maybeSingle();

        return {
          ok: true,
          sessionId: updated?.id ?? existingSession.id,
          mutualMatch: Boolean(updated?.matched_at),
          chemistryUnlocked: Boolean(updated?.chemistry_unlocked),
        };
      }

      const { data: inserted } = await db
        .from("random_friday_sessions")
        .insert({
          user_a,
          user_b,
          town: data.town === "All" ? "Windhoek" : data.town,
          mode: data.mode,
          ...updateFields,
        })
        .select("id,matched_at,chemistry_unlocked")
        .maybeSingle();

      return {
        ok: true,
        sessionId: inserted?.id ?? null,
        mutualMatch: Boolean(inserted?.matched_at),
        chemistryUnlocked: Boolean(inserted?.chemistry_unlocked),
      };
    } catch {
      return {
        ok: false,
        sessionId: null,
        mutualMatch: false,
        chemistryUnlocked: false,
      };
    }
  });

export const saveProfileGameCardServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(saveProfileGameCardSchema)
  .handler(async ({ context, data }) => {
    const db = untypedDb(context.supabase);
    try {
      const { error } = await db.from("profile_game_cards").upsert(
        {
          user_id: context.userId,
          elevator_prompt: data.elevatorPrompt,
          elevator_script: data.elevatorScript,
          elevator_audio_path: data.elevatorAudioPath ?? null,
          two_truths_statements: data.twoTruthsStatements,
          two_truths_lie_index: data.twoTruthsLieIndex,
          this_or_that_answers: data.thisOrThatAnswers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      return { ok: !error };
    } catch {
      return { ok: false };
    }
  });

export const submitChatGameChoiceServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(submitChatGameChoiceSchema)
  .handler(async ({ context, data }) => {
    const db = untypedDb(context.supabase);
    const { userId } = context;

    try {
      const { data: match } = await context.supabase
        .from("matches")
        .select("id,user_a,user_b")
        .eq("id", data.matchId)
        .maybeSingle();
      if (!match) return { ok: false, bothAnswered: false };

      const amUserA = match.user_a === userId;
      const choiceColumn = amUserA ? "user_a_choice" : "user_b_choice";

      const { data: round } = await db
        .from("chat_game_rounds")
        .upsert(
          {
            match_id: data.matchId,
            game_type: data.gameType,
            prompt_key: data.promptKey,
            [choiceColumn]: data.choice,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "match_id,game_type,prompt_key" },
        )
        .select("user_a_choice,user_b_choice")
        .maybeSingle();

      return {
        ok: true,
        bothAnswered: Boolean(round?.user_a_choice && round?.user_b_choice),
        userAChoice: (round?.user_a_choice as string | null) ?? null,
        userBChoice: (round?.user_b_choice as string | null) ?? null,
      };
    } catch {
      return { ok: false, bothAnswered: false };
    }
  });

export const castFeedPollVoteServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(castFeedPollVoteSchema)
  .handler(async ({ context, data }) => {
    const db = untypedDb(context.supabase);
    try {
      await db.from("feed_poll_votes").upsert(
        {
          poll_id: data.pollId,
          user_id: context.userId,
          choice: data.choice,
          town: data.town,
        },
        { onConflict: "poll_id,user_id" },
      );

      const { data: rows } = await db
        .from("feed_poll_votes")
        .select("choice")
        .eq("poll_id", data.pollId);

      const tally = tallyPollVotes((rows ?? []) as Array<{ choice: string }>, [data.choice]);
      return { ok: true, total: tally.total, counts: tally.counts };
    } catch {
      return { ok: false, total: 1, counts: { [data.choice]: 1 } };
    }
  });
