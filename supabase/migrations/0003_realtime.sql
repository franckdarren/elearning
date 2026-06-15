-- ============================================================================
-- 0003_realtime.sql — Enable Supabase Realtime publication on notifications.
-- Allows the client to subscribe to inserts/updates filtered by user_id.
-- ============================================================================

alter publication supabase_realtime add table public.notifications;
