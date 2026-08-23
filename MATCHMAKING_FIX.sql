-- PALM 50 — Matchmaking + room cancellation fix
-- Run ONCE in Supabase -> SQL Editor.
-- Safe for the existing gameplay tables.

begin;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on table public.matches,
         public.match_players,
         public.match_crosses,
         public.match_events
to anon, authenticated;

-- Needed for "Cancel search" and cleanup of abandoned waiting rooms.
do $$ begin
  create policy "matches_delete"
  on public.matches
  for delete
  to anon
  using (status = 'waiting');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "players_delete"
  on public.match_players
  for delete
  to anon
  using (true);
exception when duplicate_object then null; end $$;

-- These are useful for cleanup/retry logic during a match.
do $$ begin
  create policy "events_delete"
  on public.match_events
  for delete
  to anon
  using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "crosses_delete"
  on public.match_crosses
  for delete
  to anon
  using (true);
exception when duplicate_object then null; end $$;

-- Make sure Realtime contains the important PvP tables.
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.match_players;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.match_events;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.match_crosses;
exception when duplicate_object then null; end $$;

-- One-time cleanup: remove abandoned RANDOM waiting rooms older than 2 hours.
-- Their child rows disappear because match_players references matches ON DELETE CASCADE.
delete from public.matches
where mode = 'random'
  and status = 'waiting'
  and created_at < now() - interval '2 hours';

commit;
