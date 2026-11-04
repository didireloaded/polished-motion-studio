DROP POLICY IF EXISTS "members read poll votes" ON public.feed_poll_votes;
CREATE POLICY "members read own poll votes" ON public.feed_poll_votes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_poll_tally(_poll_id text)
RETURNS TABLE(choice text, votes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.choice, count(*)::bigint FROM public.feed_poll_votes v
  WHERE v.poll_id = _poll_id AND auth.uid() IS NOT NULL
  GROUP BY v.choice
$$;
REVOKE ALL ON FUNCTION public.get_poll_tally(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_poll_tally(text) TO authenticated;