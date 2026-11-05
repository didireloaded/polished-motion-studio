import { z } from "zod";

export const dateAvailability = [
  "Weekday evenings",
  "Friday evening",
  "Saturday morning",
  "Saturday afternoon",
  "Saturday evening",
  "Sunday morning",
  "Sunday afternoon",
] as const;

export type DateAvailability = (typeof dateAvailability)[number];

export const dateSuggestionInputSchema = z.object({
  matchId: z.string().uuid(),
  town: z.string().trim().min(2).max(80),
  sharedInterests: z.string().trim().min(2).max(200),
  preferences: z.string().trim().max(300).default(""),
  availability: z
    .array(z.enum(dateAvailability))
    .min(1)
    .max(dateAvailability.length)
    .refine((slots) => new Set(slots).size === slots.length, "Choose distinct time windows."),
});

export const dateSuggestionSchema = z
  .object({
    activity: z.string().trim().min(2).max(80),
    note: z.string().trim().max(200),
    reason: z.string().trim().min(2).max(180),
    timeWindow: z.enum(dateAvailability),
  })
  .strict();

export type DateSuggestionInput = z.infer<typeof dateSuggestionInputSchema>;
export type DateSuggestion = z.infer<typeof dateSuggestionSchema>;

export function dateSuggestionPrompt(input: DateSuggestionInput) {
  return {
    town: input.town,
    sharedInterests: input.sharedInterests,
    preferences: input.preferences,
    availability: input.availability,
  };
}

export function parseDateSuggestion(
  raw: string,
  availability: readonly DateAvailability[],
): DateSuggestion | null {
  try {
    const result = dateSuggestionSchema.safeParse(JSON.parse(raw));
    if (!result.success || !availability.includes(result.data.timeWindow)) return null;
    return result.data;
  } catch {
    return null;
  }
}

export function dateSuggestionNote(suggestion: DateSuggestion): string {
  return `Preferred window: ${suggestion.timeWindow}. ${suggestion.note}`.trim();
}
