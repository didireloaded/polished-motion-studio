import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const accounts = sqliteTable('accounts', {
 userId: text('user_id').primaryKey(),
 payload: text('payload').notNull(),
 version: integer('version').notNull().default(0),
 updatedAt: integer('updated_at').notNull(),
});

export const communityPosts = sqliteTable('community_posts', {
 id: text('id').primaryKey(),
 authorId: text('author_id').notNull(),
 town: text('town').notNull(),
 kind: text('kind').notNull(),
 body: text('body').notNull(),
 eventTitle: text('event_title'),
 eventAt: integer('event_at'),
 eventPlace: text('event_place'),
 createdAt: integer('created_at').notNull(),
 deletedAt: integer('deleted_at'),
}, (t) => [index('community_posts_created_idx').on(t.createdAt), index('community_posts_author_idx').on(t.authorId)]);

export const communityReplies = sqliteTable('community_replies', {
 id: text('id').primaryKey(),
 postId: text('post_id').notNull().references(() => communityPosts.id),
 authorId: text('author_id').notNull(),
 body: text('body').notNull(),
 createdAt: integer('created_at').notNull(),
 acceptedAt: integer('accepted_at'),
}, (t) => [uniqueIndex('community_reply_once_idx').on(t.postId, t.authorId), index('community_replies_author_idx').on(t.authorId)]);

export const communityMessages = sqliteTable('community_messages', {
 id: text('id').primaryKey(),
 replyId: text('reply_id').notNull().references(() => communityReplies.id),
 senderId: text('sender_id').notNull(),
 body: text('body').notNull(),
 createdAt: integer('created_at').notNull(),
}, (t) => [index('community_messages_thread_idx').on(t.replyId, t.createdAt)]);

export const memberBlocks = sqliteTable('member_blocks', {
 blockerId: text('blocker_id').notNull(),
 blockedId: text('blocked_id').notNull(),
 createdAt: integer('created_at').notNull(),
}, (t) => [uniqueIndex('member_blocks_pair_idx').on(t.blockerId, t.blockedId), index('member_blocks_blocked_idx').on(t.blockedId)]);

export const communityReports = sqliteTable('community_reports', {
 id: text('id').primaryKey(),
 reporterId: text('reporter_id').notNull(),
 targetType: text('target_type').notNull(),
 targetId: text('target_id').notNull(),
 reason: text('reason').notNull(),
 createdAt: integer('created_at').notNull(),
}, (t) => [index('community_reports_reporter_idx').on(t.reporterId)]);
