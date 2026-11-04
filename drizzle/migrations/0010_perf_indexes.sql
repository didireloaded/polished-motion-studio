CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON public.blocks (blocked_id, blocker_id);
CREATE INDEX IF NOT EXISTS post_replies_post_created_idx ON public.post_replies (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_replies_sender_idx ON public.post_replies (sender_id);
CREATE INDEX IF NOT EXISTS post_reactions_user_idx ON public.post_reactions (user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS profiles_active_town_idx ON public.profiles (town) WHERE active;
CREATE INDEX IF NOT EXISTS posts_town_created_idx ON public.posts (town, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports (reporter_id);