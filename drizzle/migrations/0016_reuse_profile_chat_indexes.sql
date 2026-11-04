-- Profile discovery filters active members by town/age/intent and takes recent cards.
CREATE INDEX IF NOT EXISTS idx_profiles_active_created_at
  ON public.profiles (created_at DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_active_town_age_intent
  ON public.profiles (town, age, intent, created_at DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_active_age_created
  ON public.profiles (age, created_at DESC) WHERE active = true;

-- The match list checks each participant separately and orders by creation time.
CREATE INDEX IF NOT EXISTS idx_matches_user_a_created
  ON public.matches (user_a, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_user_b_created
  ON public.matches (user_b, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_target_actor_liked
  ON public.decisions (target_id, actor_id) WHERE liked = true;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- Migration 0015 repeats existing primary-key or equivalent indexes under new names.
-- Keep the established indexes; remove only those redundant secondary copies.
DROP INDEX IF EXISTS public.idx_decisions_actor_target;
DROP INDEX IF EXISTS public.idx_blocks_blocker_blocked;
DROP INDEX IF EXISTS public.idx_blocks_blocked_blocker;
DROP INDEX IF EXISTS public.idx_messages_match_created;
DROP INDEX IF EXISTS public.idx_messages_sender_created;
DROP INDEX IF EXISTS public.idx_date_plans_match_id;
