-- Compound performance indexes for high-traffic discovery, matching, and chat queries
CREATE INDEX IF NOT EXISTS idx_decisions_actor_target
  ON public.decisions (actor_id, target_id);

CREATE INDEX IF NOT EXISTS idx_matches_users
  ON public.matches (user_a, user_b);

CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON public.messages (match_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked
  ON public.blocks (blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active_town_age
  ON public.profiles (active, town, age);
