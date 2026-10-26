import { z } from "zod";
import { towns } from "./model.ts";

const uuid = z.string().uuid();
const content = (max: number) => z.string().trim().min(3).max(max);
const reasons = z.enum(["Harassment", "Hate or threats", "Sexual content", "Spam", "Other"]);

export const communityActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("post"), id: uuid, town: z.enum(towns),
    kind: z.enum(["thought", "event"]), body: content(400),
    eventTitle: z.string().trim().max(80).optional(),
    eventAt: z.number().int().optional(),
    eventPlace: z.string().trim().max(100).optional(),
  }),
  z.object({ type: z.literal("deletePost"), postId: uuid }),
  z.object({ type: z.literal("reply"), id: uuid, postId: uuid, body: content(500) }),
  z.object({ type: z.literal("accept"), replyId: uuid }),
  z.object({ type: z.literal("message"), id: uuid, replyId: uuid, body: content(2000) }),
  z.object({ type: z.literal("block"), memberId: z.string().min(1) }),
  z.object({ type: z.literal("unblock"), memberId: z.string().min(1) }),
  z.object({ type: z.literal("report"), id: uuid, targetType: z.enum(["post", "reply", "message"]), targetId: uuid, reason: reasons }),
]);
export type CommunityAction = z.infer<typeof communityActionSchema>;

export function validatePostAction(action: Extract<CommunityAction, { type: "post" }>, now: number): string | null {
  if (action.kind === "thought") {
    if (action.eventTitle || action.eventAt || action.eventPlace) return "This post cannot include event details.";
    return null;
  }
  if (!action.eventTitle || !action.eventPlace || !action.eventAt) return "Add an event, time, and meeting place.";
  if (action.eventAt <= now || action.eventAt > now + 90 * 86400000) return "Choose a time within the next 90 days.";
  return null;
}

export function isConversationParticipant(userId: string, posterId: string, responderId: string, acceptedAt: number | null): boolean {
  return acceptedAt !== null && (userId === posterId || userId === responderId);
}

export function publicPost<T extends {
  id: string; town: string; kind: string; body: string; eventTitle: string | null;
  eventAt: number | null; eventPlace: string | null; createdAt: number; authorId: string;
}>(post: T, userId: string, replied: boolean) {
  return {
    id: post.id, town: post.town, kind: post.kind, body: post.body,
    eventTitle: post.eventTitle, eventAt: post.eventAt,
    eventPlace: post.eventPlace, createdAt: post.createdAt,
    own: post.authorId === userId, replied,
  };
}
