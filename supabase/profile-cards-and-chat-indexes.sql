-- Lovable Cloud / Supabase SQL: Indexes for Profile Cards & Chat Threads
-- Optimizes Discover/Nearby profile card queries and Chats/Date Plan thread queries.

CREATE INDEX IF NOT EXISTS idx_profiles_active_created_at
  ON public.profiles (created_at DESC)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_active_town_age_intent
  ON public.profiles (town, age, intent, created_at DESC)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_active_age_created
  ON public.profiles (age, created_at DESC)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_decisions_actor_target
  ON public.decisions (actor_id, target_id);

CREATE INDEX IF NOT EXISTS idx_decisions_target_actor_liked
  ON public.decisions (target_id, actor_id)
  WHERE liked = true;

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked
  ON public.blocks (blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked_blocker
  ON public.blocks (blocked_id, blocker_id);

CREATE INDEX IF NOT EXISTS idx_matches_user_a_created
  ON public.matches (user_a, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_user_b_created
  ON public.matches (user_b, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON public.messages (match_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON public.messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_date_plans_match_id
  ON public.date_plans (match_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
