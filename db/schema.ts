import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const accounts = sqliteTable('accounts', {
 userId: text('user_id').primaryKey(),
 payload: text('payload').notNull(),
 version: integer('version').notNull().default(0),
 updatedAt: integer('updated_at').notNull(),
});
