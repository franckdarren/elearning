-- ============================================================================
-- 0002_storage.sql — Storage buckets + access policies
--
-- 3 buckets:
--   videos      → private. Access via server-issued signed URLs only.
--   documents   → private. Access via server-issued signed URLs only.
--   thumbnails  → public. Non-sensitive cover images.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('videos',     'videos',     false),
  ('documents',  'documents',  false),
  ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Policies on storage.objects
--
-- Rule of thumb:
--   - Reads from "videos" / "documents" go through signed URLs created
--     server-side with the service role. Authenticated clients have no
--     direct SELECT permission.
--   - Uploads / deletes are server-side only (service role), so no
--     write policy is granted to authenticated users.
--   - "thumbnails" is public-read.
-- ---------------------------------------------------------------------------

-- thumbnails: public read
drop policy if exists "thumbnails_public_read" on storage.objects;
create policy "thumbnails_public_read" on storage.objects
  for select to public
  using (bucket_id = 'thumbnails');
