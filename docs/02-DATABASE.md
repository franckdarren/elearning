# DATABASE — Schéma & RLS

> Toutes les tables utilisent `id uuid primary key default gen_random_uuid()` et `created_at timestamptz default now()` sauf indication contraire.

> **Workflow Drizzle** : le schéma est défini dans `lib/db/schema.ts` (Drizzle ORM). Les migrations SQL sont générées via `drizzle-kit generate` et appliquées via `drizzle-kit migrate` dans `/supabase/migrations`. Les **policies RLS** ne sont pas gérées par Drizzle : elles sont écrites en SQL pur dans un fichier dédié `/supabase/migrations/rls.sql`. Les exemples SQL ci-dessous décrivent la cible — Drizzle produit l'équivalent à partir du schéma TypeScript.

## 1. Modèle de données (résumé)

```
auth.users (Supabase)
  └─ profiles (1-1)  → role

academic_years
classes ── class_subjects ── subjects
                │
teachers ─ teacher_assignments ─ (class + subject)
students ─ student_enrollments ─ class
          student_subject_access ─ (student + class + subject)

subjects → chapters → sequences → resources (videos | documents)
subjects → quizzes → questions → options → attempts → answers

content_schedule (publication programmée)
progress (suivi)
notifications
activity_logs
```

## 2. Enums

```sql
create type user_role as enum ('admin', 'manager', 'teacher', 'student');
create type content_status as enum ('draft', 'scheduled', 'published', 'archived');
create type resource_type as enum ('video', 'document');
create type document_access as enum ('downloadable', 'view_only');
create type question_type as enum ('single', 'multiple', 'true_false');
create type notification_type as enum ('new_course','new_document','new_quiz','quiz_reminder','scheduled_published');
```

## 3. Tables

### profiles
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  first_name text not null,
  last_name text not null,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
```

### academic_years
```sql
create table academic_years (
  id uuid primary key default gen_random_uuid(),
  label text not null,            -- ex: "2025-2026"
  start_date date,
  end_date date,
  is_current boolean default false,
  created_at timestamptz default now()
);
```

### classes
```sql
create table classes (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid references academic_years(id) on delete set null,
  name text not null,             -- ex: "3ème A"
  level text not null,            -- ex: "3ème"
  description text,
  created_at timestamptz default now()
);
```

### subjects
```sql
create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,             -- ex: "Mathématiques"
  description text,
  created_at timestamptz default now()
);
```

### class_subjects (matières proposées dans une classe)
```sql
create table class_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  unique (class_id, subject_id)
);
```

### teacher_assignments (enseignant ↔ classe + matière)
```sql
create table teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  unique (teacher_id, class_id, subject_id)
);
```

### student_enrollments (élève ↔ classe)
```sql
create table student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  unique (student_id, class_id)
);
```

### student_subject_access (élève ↔ matière autorisée)
```sql
-- NB : l'appartenance à une classe ne donne PAS accès à toutes les matières.
create table student_subject_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  unique (student_id, class_id, subject_id)
);
```

### chapters
```sql
create table chapters (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

### sequences (FACULTATIF — une ressource peut être directement dans un chapitre)
```sql
create table sequences (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz default now()
);
```

### resources (vidéos et documents)
```sql
create table resources (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  sequence_id uuid references sequences(id) on delete set null,  -- null = directement dans le chapitre
  type resource_type not null,
  title text not null,
  description text,

  -- vidéo
  video_path text,                -- chemin storage (bucket privé) ou URL externe
  thumbnail_path text,
  duration_seconds int,
  author text,

  -- document
  document_path text,
  document_access document_access default 'view_only',

  status content_status not null default 'draft',
  published_at timestamptz,       -- date de publication programmée/effective
  unpublish_at timestamptz,       -- date de retrait (vidéos, optionnel)
  position int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

### quizzes
```sql
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  chapter_id uuid references chapters(id) on delete set null,
  title text not null,
  description text,
  duration_minutes int,
  max_attempts int default 1,
  opens_at timestamptz,
  closes_at timestamptz,
  status content_status not null default 'draft',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

### questions
```sql
create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  type question_type not null,
  text text not null,
  points numeric default 1,
  position int not null default 0
);
```

### question_options
```sql
create table question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  position int not null default 0
);
```

### quiz_attempts
```sql
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  score numeric,
  max_score numeric,
  started_at timestamptz default now(),
  submitted_at timestamptz
);
```

### quiz_answers
```sql
create table quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}'
);
```

### progress (suivi pédagogique)
```sql
create table progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  resource_id uuid references resources(id) on delete cascade,
  watched boolean default false,      -- vidéo visionnée / doc consulté
  watched_seconds int default 0,
  completed_at timestamptz,
  unique (student_id, resource_id)
);
```

### notifications
```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);
```

### activity_logs (journalisation, optionnel)
```sql
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);
```

## 4. Fonction helper de rôle

```sql
create or replace function public.user_role()
returns user_role language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;
```

## 5. Row Level Security (principes)

Activer RLS sur **toutes** les tables : `alter table X enable row level security;`

### Règles clés

**profiles**
- `admin` : tout.
- chaque utilisateur peut lire son propre profil.

**classes / subjects / class_subjects / academic_years**
- `admin`, `manager` : lecture + écriture.
- `teacher` : lecture des classes/matières qui lui sont assignées (via `teacher_assignments`).
- `student` : lecture de sa classe et de ses matières autorisées uniquement.

**chapters / sequences / resources**
- `admin`, `manager` : tout.
- `teacher` : écriture/lecture **seulement** sur les (class_id, subject_id) présents dans ses `teacher_assignments`.
- `student` : lecture **seulement** si :
  1. il existe un `student_subject_access` correspondant (class_id + subject_id), **ET**
  2. le contenu est `published` (status = 'published' et `published_at <= now()` et (`unpublish_at is null` ou `unpublish_at > now()`)).

**quizzes / questions / question_options**
- `teacher`/`manager`/`admin` : selon périmètre (assignments).
- `student` : lecture des quiz `published`, ouverts (`opens_at <= now() <= closes_at`), sur matière autorisée. **Ne jamais exposer `is_correct` au client tant que le quiz n'est pas soumis/corrigé** → la correction se fait côté serveur via service role.

**quiz_attempts / quiz_answers / progress**
- `student` : lecture/écriture de ses **propres** lignes uniquement (`student_id = auth.uid()`).
- `teacher`/`manager`/`admin` : lecture sur leur périmètre.

**notifications**
- chaque user : lecture/écriture de ses propres notifications.

> ⚠️ La correction des QCM et la génération des signed URLs vidéo se font côté serveur (Server Actions / route handlers) avec le **service role key**, jamais côté client.

## 6. Storage (buckets)

```
videos     (privé)  → accès via signed URLs serveur
documents  (privé)  → accès via signed URLs serveur
thumbnails (public) → miniatures non sensibles
```

## 7. Publication programmée (cron)

Utiliser **pg_cron** (Supabase) ou un Vercel Cron Job toutes les 5 min qui :
- passe les `resources`/`quizzes` de `scheduled` → `published` quand `published_at <= now()`.
- archive les vidéos dont `unpublish_at <= now()`.
- ferme les quiz dont `closes_at <= now()`.
- crée les notifications correspondantes.
