alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_check
  check (char_length(btrim(body)) between 3 and 650);
