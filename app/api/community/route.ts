import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { accounts, communityPosts, communityReplies, communityMessages, memberBlocks, communityReports } from "../../../db/schema";
import { communityActionSchema, isConversationParticipant, publicPost, validatePostAction } from "../../../lib/community";
import { and, desc, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";
const responseOptions = { headers: { "Cache-Control": "no-store" } };
const error = (message: string, status = 400) => Response.json({ error: message }, { status, ...responseOptions });
const day = 86400000;

async function blockedIds(userId: string) {
  const blocks = await getDb().select().from(memberBlocks).where(or(eq(memberBlocks.blockerId, userId), eq(memberBlocks.blockedId, userId)));
  return new Set(blocks.map((b) => b.blockerId === userId ? b.blockedId : b.blockerId));
}
async function participant(replyId: string, userId: string) {
  const reply = (await getDb().select().from(communityReplies).where(eq(communityReplies.id, replyId)))[0];
  if (!reply) return null;
  const post = (await getDb().select().from(communityPosts).where(eq(communityPosts.id, reply.postId)))[0];
  if (!post || !isConversationParticipant(userId, post.authorId, reply.authorId, reply.acceptedAt)) return null;
  const blocked = await blockedIds(userId);
  const otherId = post.authorId === userId ? reply.authorId : post.authorId;
  if (blocked.has(otherId)) return null;
  return { reply, post, otherId };
}
function publicMember(payload: string | undefined) {
  if (!payload) return { name: "Member", town: "Namibia" };
  try {
    const p = JSON.parse(payload).profile;
    return { name: typeof p?.name === "string" && p.name ? p.name : "Member", town: typeof p?.town === "string" ? p.town : "Namibia" };
  } catch { return { name: "Member", town: "Namibia" }; }
}
async function accountProfile(userId: string) {
  const row = (await getDb().select().from(accounts).where(eq(accounts.userId, userId)))[0];
  if (!row) return null;
  try { const state = JSON.parse(row.payload); return state.onboarded && state.profile?.adult ? state.profile : null; }
  catch { return null; }
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    const userId = user?.userId ?? "";
    const url = new URL(request.url);
    const threadId = url.searchParams.get("thread");
    if (threadId) {
      if (!user) return error("Sign in to read messages.", 401);
      if (!/^[0-9a-f-]{36}$/i.test(threadId)) return error("Conversation not found.", 404);
      const access = await participant(threadId, userId);
      if (!access) return error("Conversation not found.", 404);
      const rows = await getDb().select().from(communityMessages).where(eq(communityMessages.replyId, threadId)).orderBy(desc(communityMessages.createdAt)).limit(200);
      const other = (await getDb().select().from(accounts).where(eq(accounts.userId, access.otherId)))[0];
      return Response.json({ thread: {
        id: threadId, person: publicMember(other?.payload), post: access.post.body,
        messages: rows.reverse().map((m) => ({ id: m.id, body: m.body, at: m.createdAt, mine: m.senderId === userId })),
      } }, responseOptions);
    }
    const blocked = user ? await blockedIds(userId) : new Set<string>();
    const reports = user ? await getDb().select().from(communityReports).where(eq(communityReports.reporterId, userId)) : [];
    const reportedPosts = new Set(reports.filter((r) => r.targetType === "post").map((r) => r.targetId));
    const postRows = await getDb().select().from(communityPosts).where(isNull(communityPosts.deletedAt)).orderBy(desc(communityPosts.createdAt)).limit(80);
    const ownedRows = user ? await getDb().select().from(communityPosts).where(eq(communityPosts.authorId, userId)).limit(1000) : [];
    const posts = postRows.filter((p) => !blocked.has(p.authorId) && !reportedPosts.has(p.id));
    const myReplies = user ? await getDb().select().from(communityReplies).where(eq(communityReplies.authorId, userId)).orderBy(desc(communityReplies.createdAt)).limit(1000) : [];
    const ownedIds = ownedRows.map((p) => p.id);
    const repliesToMine = user && ownedIds.length ? await getDb().select().from(communityReplies).where(inArray(communityReplies.postId, ownedIds)).orderBy(desc(communityReplies.createdAt)).limit(1000) : [];
    const relevantAccepted = [...myReplies, ...repliesToMine].filter((r) => r.acceptedAt !== null);
    const threadIds = new Set(relevantAccepted.map((r) => r.id));
    const otherIds = new Set<string>();
    const threadPostIds = [...new Set(relevantAccepted.map((r) => r.postId))];
    const threadPosts = threadPostIds.length ? await getDb().select().from(communityPosts).where(inArray(communityPosts.id, threadPostIds)) : [];
    const postById = new Map([...postRows, ...ownedRows, ...threadPosts].map((p) => [p.id, p]));
    const threads = relevantAccepted.filter((r) => {
      const p = postById.get(r.postId);
      if (!p) return false;
      const otherId = p.authorId === userId ? r.authorId : p.authorId;
      if (blocked.has(otherId)) return false;
      otherIds.add(otherId);
      return true;
    });
    const otherRows = otherIds.size ? await getDb().select().from(accounts).where(inArray(accounts.userId, [...otherIds])) : [];
    const others = new Map(otherRows.map((r) => [r.userId, publicMember(r.payload)]));
    const myBlocks = user ? await getDb().select().from(memberBlocks).where(eq(memberBlocks.blockerId, userId)) : [];
    const blockedAccounts = myBlocks.length ? await getDb().select().from(accounts).where(inArray(accounts.userId, myBlocks.map((b) => b.blockedId))) : [];
    const blockedNames = new Map(blockedAccounts.map((r) => [r.userId, publicMember(r.payload)]));
    const unreadCounts = threadIds.size ? await getDb().select().from(communityMessages).where(inArray(communityMessages.replyId, [...threadIds])).orderBy(desc(communityMessages.createdAt)).limit(500) : [];
    const latest = new Map<string, { body: string; at: number }>();
    for (const m of unreadCounts) if (!latest.has(m.replyId)) latest.set(m.replyId, { body: m.body, at: m.createdAt });
    return Response.json({
      posts: posts.map((p) => publicPost(p, userId, myReplies.some((r) => r.postId === p.id))),
      myReplies: myReplies.filter((r) => posts.some((p) => p.id === r.postId)).map((r) => ({ id: r.id, postId: r.postId, body: r.body, accepted: r.acceptedAt !== null })),
      repliesToMine: repliesToMine.filter((r) => !blocked.has(r.authorId)).map((r) => ({ id: r.id, postId: r.postId, body: r.body, at: r.createdAt, accepted: r.acceptedAt !== null })),
      threads: threads.map((r) => {
        const p = postById.get(r.postId)!;
        const otherId = p.authorId === userId ? r.authorId : p.authorId;
        return { id: r.id, person: others.get(otherId) ?? { name: "Member", town: "Namibia" }, memberId: otherId, post: p.body, latest: latest.get(r.id) ?? null, at: r.acceptedAt };
      }),
      blockedMembers: myBlocks.map((b) => ({ memberId: b.blockedId, person: blockedNames.get(b.blockedId) ?? { name: "Member", town: "Namibia" } })),
    }, responseOptions);
  } catch (e) {
    console.error("Community read failed", e);
    return error("Could not load the community. Try again.", 503);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return error("Invalid origin.", 403);
  const user = await getChatGPTUser();
  if (!user) return error("Sign in to take part.", 401);
  if (Number(request.headers.get("content-length") ?? 0) > 4000) return error("Request too large.", 413);
  let action;
  try {
    const body = await request.text();
    if (body.length > 4000) return error("Request too large.", 413);
    const parsed = communityActionSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return error("Check your details and try again.");
    action = parsed.data;
  } catch { return error("Invalid request."); }
  const userId = user.userId;
  const now = Date.now();
  try {
    const db = getDb();
    const profile = await accountProfile(userId);
    if (!profile) return error("Create an adult Namibian profile before taking part.", 403);
    if (action.type === "post") {
      const invalid = validatePostAction(action, now);
      if (invalid) return error(invalid);
      if (action.town !== profile.town) return error("Choose your profile town or update your profile first.");
      const existing = (await db.select().from(communityPosts).where(eq(communityPosts.id, action.id)))[0];
      if (existing) return existing.authorId === userId ? Response.json({ ok: true }, responseOptions) : error("Try again.", 409);
      const recent = await db.select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.authorId, userId), gt(communityPosts.createdAt, now - day))).limit(3);
      if (recent.length >= 3) return error("You can create up to three posts in 24 hours.", 429);
      await db.insert(communityPosts).values({ id: action.id, authorId: userId, town: action.town, kind: action.kind, body: action.body, eventTitle: action.kind === "event" ? action.eventTitle : null, eventAt: action.kind === "event" ? action.eventAt : null, eventPlace: action.kind === "event" ? action.eventPlace : null, createdAt: now });
    } else if (action.type === "deletePost") {
      const p = (await db.select().from(communityPosts).where(eq(communityPosts.id, action.postId)))[0];
      if (!p || p.authorId !== userId) return error("Post not found.", 404);
      await db.update(communityPosts).set({ deletedAt: now }).where(and(eq(communityPosts.id, p.id), isNull(communityPosts.deletedAt)));
    } else if (action.type === "reply") {
      const post = (await db.select().from(communityPosts).where(eq(communityPosts.id, action.postId)))[0];
      if (!post || post.deletedAt !== null) return error("Post not found.", 404);
      if (post.authorId === userId) return error("You can’t reply to your own post.");
      if ((await blockedIds(userId)).has(post.authorId)) return error("This post isn’t available.", 403);
      const prior = (await db.select().from(communityReplies).where(and(eq(communityReplies.postId, post.id), eq(communityReplies.authorId, userId))))[0];
      if (prior) return prior.id === action.id ? Response.json({ ok: true }, responseOptions) : error("You already replied to this post.", 409);
      const recent = await db.select({ id: communityReplies.id }).from(communityReplies).where(and(eq(communityReplies.authorId, userId), gt(communityReplies.createdAt, now - day))).limit(20);
      if (recent.length >= 20) return error("You can send up to 20 replies in 24 hours.", 429);
      await db.insert(communityReplies).values({ id: action.id, postId: post.id, authorId: userId, body: action.body, createdAt: now });
    } else if (action.type === "accept") {
      const reply = (await db.select().from(communityReplies).where(eq(communityReplies.id, action.replyId)))[0];
      const post = reply && (await db.select().from(communityPosts).where(eq(communityPosts.id, reply.postId)))[0];
      if (!reply || !post || post.deletedAt !== null || post.authorId !== userId) return error("Reply not found.", 404);
      if ((await blockedIds(userId)).has(reply.authorId)) return error("This reply isn’t available.", 403);
      await db.update(communityReplies).set({ acceptedAt: now }).where(and(eq(communityReplies.id, reply.id), isNull(communityReplies.acceptedAt)));
    } else if (action.type === "message") {
      const access = await participant(action.replyId, userId);
      if (!access) return error("An accepted connection is required.", 403);
      const existing = (await db.select().from(communityMessages).where(eq(communityMessages.id, action.id)))[0];
      if (existing) return existing.senderId === userId && existing.replyId === action.replyId ? Response.json({ ok: true }, responseOptions) : error("Try again.", 409);
      const recent = await db.select({ id: communityMessages.id }).from(communityMessages).where(and(eq(communityMessages.senderId, userId), gt(communityMessages.createdAt, now - day))).limit(100);
      if (recent.length >= 100) return error("You can send up to 100 messages in 24 hours.", 429);
      const count = await db.select({ id: communityMessages.id }).from(communityMessages).where(eq(communityMessages.replyId, action.replyId)).limit(500);
      if (count.length >= 500) return error("This conversation is full.", 429);
      await db.insert(communityMessages).values({ id: action.id, replyId: action.replyId, senderId: userId, body: action.body, createdAt: now });
    } else if (action.type === "block") {
      if (action.memberId === userId) return error("You can’t block yourself.");
      const connected = await db.select({ id: communityReplies.id }).from(communityReplies).innerJoin(communityPosts, eq(communityReplies.postId, communityPosts.id)).where(and(isNotNull(communityReplies.acceptedAt), or(and(eq(communityPosts.authorId, userId), eq(communityReplies.authorId, action.memberId)), and(eq(communityPosts.authorId, action.memberId), eq(communityReplies.authorId, userId))))).limit(1);
      if (!connected.length) return error("Connection not found.", 404);
      await db.insert(memberBlocks).values({ blockerId: userId, blockedId: action.memberId, createdAt: now }).onConflictDoNothing();
    } else if (action.type === "unblock") {
      await db.delete(memberBlocks).where(and(eq(memberBlocks.blockerId, userId), eq(memberBlocks.blockedId, action.memberId)));
    } else if (action.type === "report") {
      const recent = await db.select({ id: communityReports.id }).from(communityReports).where(and(eq(communityReports.reporterId, userId), gt(communityReports.createdAt, now - day))).limit(20);
      if (recent.length >= 20) return error("You can send up to 20 reports in 24 hours.", 429);
      if (action.targetType === "post") {
        const post = (await db.select().from(communityPosts).where(eq(communityPosts.id, action.targetId)))[0];
        if (!post || post.deletedAt !== null) return error("Post not found.", 404);
      } else if (action.targetType === "reply") {
        const reply = (await db.select().from(communityReplies).where(eq(communityReplies.id, action.targetId)))[0];
        const post = reply && (await db.select().from(communityPosts).where(eq(communityPosts.id, reply.postId)))[0];
        if (!reply || !post || (reply.authorId !== userId && post.authorId !== userId)) return error("Reply not found.", 404);
      } else {
        const message = (await db.select().from(communityMessages).where(eq(communityMessages.id, action.targetId)))[0];
        if (!message || !(await participant(message.replyId, userId))) return error("Message not found.", 404);
      }
      await db.insert(communityReports).values({ id: action.id, reporterId: userId, targetType: action.targetType, targetId: action.targetId, reason: action.reason, createdAt: now });
    }
    return Response.json({ ok: true }, responseOptions);
  } catch (e) {
    console.error("Community write failed", e);
    return error("Couldn’t save that. Try again.", 503);
  }
}
