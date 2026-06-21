-- Fix : une ressource publiée sans date programmée (published_at IS NULL)
-- doit être visible par l'élève immédiatement. L'ancienne policy exigeait
-- `published_at is not null`, ce qui masquait toute ressource publiée
-- manuellement sans planification.

drop policy if exists "resources_student_select_published" on public.resources;

create policy "resources_student_select_published" on public.resources
  for select to authenticated
  using (
    public.user_role() = 'student'
    and status = 'published'
    and (published_at is null or published_at <= now())
    and (unpublish_at is null or unpublish_at > now())
    and exists (
      select 1
      from public.chapters c
      join public.student_subject_access ssa
        on ssa.class_id = c.class_id and ssa.subject_id = c.subject_id
      where c.id = resources.chapter_id and ssa.student_id = auth.uid()
    )
  );
