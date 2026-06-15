-- ---------------------------------------------------------------------------
-- pg_cron : publication automatique toutes les 5 minutes
-- Remplace le Vercel Cron Job (incompatible avec le plan gratuit Vercel).
-- ---------------------------------------------------------------------------

-- 1. Activer l'extension (déjà disponible sur Supabase, même en free tier)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Fonction de publication
CREATE OR REPLACE FUNCTION cron_publish()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r     RECORD;
  chap  RECORD;
  notif_type  notification_type;
  notif_title TEXT;
BEGIN
  -- 1) Passer les ressources "scheduled" → "published" dont published_at est dépassé
  FOR r IN
    UPDATE resources
    SET status = 'published'
    WHERE status = 'scheduled'
      AND published_at IS NOT NULL
      AND published_at <= now()
    RETURNING id, chapter_id, type, title
  LOOP
    -- Récupérer la classe et la matière du chapitre
    SELECT class_id, subject_id INTO chap
    FROM chapters
    WHERE id = r.chapter_id
    LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    -- Type de notification selon le type de ressource
    IF r.type = 'video' THEN
      notif_type  := 'new_course';
      notif_title := 'Nouvelle vidéo publiée';
    ELSE
      notif_type  := 'new_document';
      notif_title := 'Nouveau document publié';
    END IF;

    -- Notifier tous les élèves ayant accès à cette matière
    INSERT INTO notifications (user_id, type, title, body, link)
    SELECT
      ssa.student_id,
      notif_type,
      notif_title,
      r.title,
      '/student/chapter/' || r.chapter_id::text
    FROM student_subject_access ssa
    WHERE ssa.class_id   = chap.class_id
      AND ssa.subject_id = chap.subject_id;
  END LOOP;

  -- 2) Archiver les ressources publiées dont unpublish_at est dépassé
  UPDATE resources
  SET status = 'archived'
  WHERE status = 'published'
    AND unpublish_at IS NOT NULL
    AND unpublish_at <= now();

  -- 3) Archiver les quiz publiés dont closes_at est dépassé
  UPDATE quizzes
  SET status = 'archived'
  WHERE status = 'published'
    AND closes_at IS NOT NULL
    AND closes_at <= now();
END;
$$;

-- 3. Planifier le job toutes les 5 minutes (idempotent)
SELECT cron.unschedule('publish-scheduled-content')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-content'
);

SELECT cron.schedule(
  'publish-scheduled-content',
  '*/5 * * * *',
  'SELECT cron_publish()'
);
