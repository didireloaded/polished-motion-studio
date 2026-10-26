CREATE TABLE `community_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`reply_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reply_id`) REFERENCES `community_replies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `community_messages_thread_idx` ON `community_messages` (`reply_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`town` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`event_title` text,
	`event_at` integer,
	`event_place` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `community_posts_created_idx` ON `community_posts` (`created_at`);--> statement-breakpoint
CREATE INDEX `community_posts_author_idx` ON `community_posts` (`author_id`);--> statement-breakpoint
CREATE TABLE `community_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`accepted_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `community_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_reply_once_idx` ON `community_replies` (`post_id`,`author_id`);--> statement-breakpoint
CREATE INDEX `community_replies_author_idx` ON `community_replies` (`author_id`);--> statement-breakpoint
CREATE TABLE `community_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `community_reports_reporter_idx` ON `community_reports` (`reporter_id`);--> statement-breakpoint
CREATE TABLE `member_blocks` (
	`blocker_id` text NOT NULL,
	`blocked_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_blocks_pair_idx` ON `member_blocks` (`blocker_id`,`blocked_id`);--> statement-breakpoint
CREATE INDEX `member_blocks_blocked_idx` ON `member_blocks` (`blocked_id`);