-- ============================================================================
-- 0007_establishments_rls.sql — RLS multi-établissement
--
-- Jusqu'ici les gestionnaires avaient un accès NON cloisonné via les policies
-- "*_admin_manager_all" (public.user_role() in ('admin','manager')). Ce fichier
-- remplace chacune de ces policies par :
--   - une policy ADMIN (accès global)
--   - une policy MANAGER restreinte à SON établissement
--     (profiles.establishment_id du gestionnaire courant).
--
-- Rappel : les requêtes applicatives via Drizzle (DATABASE_URL) ne passent PAS
-- par RLS ; ces policies sont le filet de sécurité pour tout accès direct à
-- l'API Supabase (clé anon/authenticated). Le filtrage applicatif reste requis.
--
-- À appliquer APRÈS 0006_establishments.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper : établissement de l'utilisateur courant.
-- SECURITY DEFINER pour contourner la RLS sur profiles (cf. public.user_role()).
-- ---------------------------------------------------------------------------
create or replace function public.user_establishment_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select establishment_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.user_establishment_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger handle_new_user : propage aussi establishment_id depuis le metadata
-- (l'action serveur le confirme ensuite via Drizzle).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, establishment_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student'),
    nullif(new.raw_user_meta_data->>'establishment_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- establishments — RLS
--   admin : tout ; manager/teacher/student : lecture de SON établissement.
-- ---------------------------------------------------------------------------
alter table public.establishments enable row level security;

create policy "establishments_admin_all" on public.establishments
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "establishments_member_select" on public.establishments
  for select to authenticated
  using (id = public.user_establishment_id());

-- ===========================================================================
-- profiles — le gestionnaire peut lire les profils de son établissement.
-- (les policies existantes admin/self restent en place)
-- ===========================================================================
create policy "profiles_manager_select_scope" on public.profiles
  for select to authenticated
  using (
    public.user_role() = 'manager'
    and establishment_id = public.user_establishment_id()
  );

-- ===========================================================================
-- academic_years — catalogue global : écriture réservée à l'admin.
-- (la lecture pour tous reste assurée par "academic_years_select_all")
-- ===========================================================================
drop policy if exists "academic_years_admin_manager_all" on public.academic_years;

create policy "academic_years_admin_all" on public.academic_years
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

-- ===========================================================================
-- subjects
-- ===========================================================================
drop policy if exists "subjects_admin_manager_all" on public.subjects;

create policy "subjects_admin_all" on public.subjects
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "subjects_manager_scope_all" on public.subjects
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and establishment_id = public.user_establishment_id()
  )
  with check (
    public.user_role() = 'manager'
    and establishment_id = public.user_establishment_id()
  );

-- ===========================================================================
-- classes
-- ===========================================================================
drop policy if exists "classes_admin_manager_all" on public.classes;

create policy "classes_admin_all" on public.classes
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "classes_manager_scope_all" on public.classes
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and establishment_id = public.user_establishment_id()
  )
  with check (
    public.user_role() = 'manager'
    and establishment_id = public.user_establishment_id()
  );

-- ===========================================================================
-- class_subjects — scope via la classe parente.
-- ===========================================================================
drop policy if exists "class_subjects_admin_manager_all" on public.class_subjects;

create policy "class_subjects_admin_all" on public.class_subjects
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "class_subjects_manager_scope_all" on public.class_subjects
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = class_subjects.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = class_subjects.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- teacher_assignments — scope via la classe.
-- ===========================================================================
drop policy if exists "teacher_assignments_admin_manager_all" on public.teacher_assignments;

create policy "teacher_assignments_admin_all" on public.teacher_assignments
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "teacher_assignments_manager_scope_all" on public.teacher_assignments
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = teacher_assignments.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = teacher_assignments.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- student_enrollments — scope via la classe.
-- ===========================================================================
drop policy if exists "student_enrollments_admin_manager_all" on public.student_enrollments;

create policy "student_enrollments_admin_all" on public.student_enrollments
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "student_enrollments_manager_scope_all" on public.student_enrollments
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = student_enrollments.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = student_enrollments.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- student_subject_access — scope via la classe.
-- ===========================================================================
drop policy if exists "student_subject_access_admin_manager_all" on public.student_subject_access;

create policy "student_subject_access_admin_all" on public.student_subject_access
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "student_subject_access_manager_scope_all" on public.student_subject_access
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = student_subject_access.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = student_subject_access.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- chapters — scope via la classe.
-- ===========================================================================
drop policy if exists "chapters_admin_manager_all" on public.chapters;

create policy "chapters_admin_all" on public.chapters
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "chapters_manager_scope_all" on public.chapters
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = chapters.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = chapters.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- sequences — scope via chapter → classe.
-- ===========================================================================
drop policy if exists "sequences_admin_manager_all" on public.sequences;

create policy "sequences_admin_all" on public.sequences
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "sequences_manager_scope_all" on public.sequences
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.chapters c
      join public.classes cl on cl.id = c.class_id
      where c.id = sequences.chapter_id
        and cl.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.chapters c
      join public.classes cl on cl.id = c.class_id
      where c.id = sequences.chapter_id
        and cl.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- resources — scope via chapter → classe.
-- ===========================================================================
drop policy if exists "resources_admin_manager_all" on public.resources;

create policy "resources_admin_all" on public.resources
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "resources_manager_scope_all" on public.resources
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.chapters c
      join public.classes cl on cl.id = c.class_id
      where c.id = resources.chapter_id
        and cl.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.chapters c
      join public.classes cl on cl.id = c.class_id
      where c.id = resources.chapter_id
        and cl.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- quizzes — scope via la classe.
-- ===========================================================================
drop policy if exists "quizzes_admin_manager_all" on public.quizzes;

create policy "quizzes_admin_all" on public.quizzes
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "quizzes_manager_scope_all" on public.quizzes
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = quizzes.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.classes c
      where c.id = quizzes.class_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- questions — scope via quiz → classe.
-- ===========================================================================
drop policy if exists "questions_admin_manager_all" on public.questions;

create policy "questions_admin_all" on public.questions
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "questions_manager_scope_all" on public.questions
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.quizzes q
      join public.classes c on c.id = q.class_id
      where q.id = questions.quiz_id
        and c.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.quizzes q
      join public.classes c on c.id = q.class_id
      where q.id = questions.quiz_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- question_options — scope via question → quiz → classe.
-- ===========================================================================
drop policy if exists "question_options_admin_manager_all" on public.question_options;

create policy "question_options_admin_all" on public.question_options
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "question_options_manager_scope_all" on public.question_options
  for all to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.questions qu
      join public.quizzes q on q.id = qu.quiz_id
      join public.classes c on c.id = q.class_id
      where qu.id = question_options.question_id
        and c.establishment_id = public.user_establishment_id()
    )
  )
  with check (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.questions qu
      join public.quizzes q on q.id = qu.quiz_id
      join public.classes c on c.id = q.class_id
      where qu.id = question_options.question_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- quiz_attempts — scope via quiz → classe (lecture pour le gestionnaire).
-- ===========================================================================
drop policy if exists "quiz_attempts_admin_manager_all" on public.quiz_attempts;

create policy "quiz_attempts_admin_all" on public.quiz_attempts
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "quiz_attempts_manager_scope_select" on public.quiz_attempts
  for select to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.quizzes q
      join public.classes c on c.id = q.class_id
      where q.id = quiz_attempts.quiz_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- quiz_answers — scope via attempt → quiz → classe (lecture).
-- ===========================================================================
drop policy if exists "quiz_answers_admin_manager_all" on public.quiz_answers;

create policy "quiz_answers_admin_all" on public.quiz_answers
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "quiz_answers_manager_scope_select" on public.quiz_answers
  for select to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.quiz_attempts qa
      join public.quizzes q on q.id = qa.quiz_id
      join public.classes c on c.id = q.class_id
      where qa.id = quiz_answers.attempt_id
        and c.establishment_id = public.user_establishment_id()
    )
  );

-- ===========================================================================
-- progress — scope via resource → chapter → classe (lecture).
-- ===========================================================================
drop policy if exists "progress_admin_manager_all" on public.progress;

create policy "progress_admin_all" on public.progress
  for all to authenticated
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "progress_manager_scope_select" on public.progress
  for select to authenticated
  using (
    public.user_role() = 'manager'
    and exists (
      select 1 from public.resources r
      join public.chapters ch on ch.id = r.chapter_id
      join public.classes c on c.id = ch.class_id
      where r.id = progress.resource_id
        and c.establishment_id = public.user_establishment_id()
    )
  );
