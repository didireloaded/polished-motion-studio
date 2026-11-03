import { z } from "zod";

export const joinLiveQueueSchema = z.object({
  town: z.string().trim().min(2).max(40).default("Windhoek"),
  mode: z.enum(["random_friday", "speed_dating"]).default("random_friday"),
  streakCount: z.number().int().min(0).max(100).default(0),
});

export type JoinLiveQueueInput = z.infer<typeof joinLiveQueueSchema>;

export const liveRoundDecisionSchema = z.object({
  partnerId: z.string().uuid(),
  town: z.string().trim().min(2).max(40).default("Windhoek"),
  mode: z.enum(["random_friday", "speed_dating"]).default("random_friday"),
  decision: z.enum(["stay", "skip"]),
  messageSent: z.string().trim().max(300).optional(),
  bonusSeconds: z.number().int().min(0).max(120).default(0),
});

export type LiveRoundDecisionInput = z.infer<typeof liveRoundDecisionSchema>;

export const saveProfileGameCardSchema = z.object({
  elevatorPrompt: z.string().trim().max(160).default(""),
  elevatorScript: z.string().trim().max(400).default(""),
  elevatorAudioPath: z.string().trim().max(240).nullable().optional(),
  twoTruthsStatements: z.array(z.string().trim().max(160)).max(3).default([]),
  twoTruthsLieIndex: z.number().int().min(0).max(2).default(2),
  thisOrThatAnswers: z.record(z.string(), z.string()).default({}),
});

export type SaveProfileGameCardInput = z.infer<typeof saveProfileGameCardSchema>;

export const submitChatGameChoiceSchema = z.object({
  matchId: z.string().uuid(),
  gameType: z.enum(["first_date_dilemma", "emoji_story", "two_truths"]),
  promptKey: z.string().trim().min(1).max(80),
  choice: z.string().trim().min(1).max(200),
});

export type SubmitChatGameChoiceInput = z.infer<typeof submitChatGameChoiceSchema>;

export const castFeedPollVoteSchema = z.object({
  pollId: z.string().trim().min(2).max(60),
  choice: z.string().trim().min(1).max(40),
  town: z.string().trim().min(2).max(40).default("Windhoek"),
});

export type CastFeedPollVoteInput = z.infer<typeof castFeedPollVoteSchema>;

/**
 * Normalizes two UUIDs into canonical ascending order `(user_a < user_b)`
 * required by `public.matches` and `public.random_friday_sessions`.
 */
export function normalizeOrderedPair(
  userOne: string,
  userTwo: string,
): {
  user_a: string;
  user_b: string;
  amUserA: boolean;
} {
  if (userOne < userTwo) {
    return { user_a: userOne, user_b: userTwo, amUserA: true };
  }
  return { user_a: userTwo, user_b: userOne, amUserA: false };
}

/**
 * Tallies poll vote rows into counts and percentages by option key.
 */
export function tallyPollVotes(
  rows: Array<{ choice: string }>,
  options: string[],
): { total: number; counts: Record<string, number>; percentages: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const opt of options) counts[opt] = 0;
  for (const row of rows) {
    counts[row.choice] = (counts[row.choice] ?? 0) + 1;
  }
  const total = rows.length;
  const percentages: Record<string, number> = {};
  for (const opt of options) {
    const count = counts[opt] ?? 0;
    percentages[opt] = total > 0 ? Math.round((count / total) * 100) : 0;
  }
  return { total, counts, percentages };
}
