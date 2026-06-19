-- ============================================================================
-- 0006_establishments.sql — Multi-tenant: notion d'établissement
--
-- Un admin crée un établissement et l'attribue à UN gestionnaire (manager_id
-- UNIQUE). Les classes, matières et utilisateurs (manager/teacher/student) sont
-- rattachés à un établissement. L'admin reste global (establishment_id NULL).
--
-- Écrit à la main (et non généré par drizzle-kit) pour maîtriser l'ordre :
-- backfill AVANT de poser les contraintes NOT NULL.
-- Les policies RLS associées sont dans 0007_establishments_rls.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table establishments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "establishments" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name"          text NOT NULL,
  "city"          text,
  "contact_email" text,
  "contact_phone" text,
  "manager_id"    uuid,
  "is_active"     boolean DEFAULT true NOT NULL,
  "created_at"    timestamptz DEFAULT now()
);

-- manager_id → profiles(id) ; un gestionnaire au plus par établissement.
ALTER TABLE "establishments"
  ADD CONSTRAINT "establishments_manager_id_profiles_id_fk"
  FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id")
  ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "establishments_manager_uq"
  ON "establishments" ("manager_id");

-- ---------------------------------------------------------------------------
-- Colonnes establishment_id (d'abord nullable pour permettre le backfill)
-- ---------------------------------------------------------------------------
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "establishment_id" uuid;
ALTER TABLE "classes"  ADD COLUMN IF NOT EXISTS "establishment_id" uuid;
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "establishment_id" uuid;

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_establishment_id_establishments_id_fk"
  FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "classes"
  ADD CONSTRAINT "classes_establishment_id_establishments_id_fk"
  FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "subjects"
  ADD CONSTRAINT "subjects_establishment_id_establishments_id_fk"
  FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id")
  ON DELETE cascade ON UPDATE no action;

-- ---------------------------------------------------------------------------
-- Backfill : un établissement par défaut rattache les données existantes.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  default_establishment_id uuid;
  existing_manager_id      uuid;
BEGIN
  -- Réutilise un établissement déjà nommé ainsi (migration idempotente) sinon le crée.
  SELECT id INTO default_establishment_id
  FROM public.establishments
  WHERE name = 'Établissement principal'
  LIMIT 1;

  IF default_establishment_id IS NULL THEN
    INSERT INTO public.establishments (name)
    VALUES ('Établissement principal')
    RETURNING id INTO default_establishment_id;
  END IF;

  UPDATE public.classes
    SET establishment_id = default_establishment_id
    WHERE establishment_id IS NULL;

  UPDATE public.subjects
    SET establishment_id = default_establishment_id
    WHERE establishment_id IS NULL;

  -- Tous les utilisateurs sauf les admins sont rattachés à l'établissement.
  UPDATE public.profiles
    SET establishment_id = default_establishment_id
    WHERE role <> 'admin' AND establishment_id IS NULL;

  -- Attribue l'établissement par défaut au premier gestionnaire existant, le cas échéant.
  SELECT id INTO existing_manager_id
  FROM public.profiles
  WHERE role = 'manager' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF existing_manager_id IS NOT NULL THEN
    UPDATE public.establishments
      SET manager_id = existing_manager_id
      WHERE id = default_establishment_id AND manager_id IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Contraintes NOT NULL + index (après backfill)
-- ---------------------------------------------------------------------------
ALTER TABLE "classes"  ALTER COLUMN "establishment_id" SET NOT NULL;
ALTER TABLE "subjects" ALTER COLUMN "establishment_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "classes_establishment_idx"  ON "classes"  ("establishment_id");
CREATE INDEX IF NOT EXISTS "subjects_establishment_idx" ON "subjects" ("establishment_id");
CREATE INDEX IF NOT EXISTS "profiles_establishment_idx" ON "profiles" ("establishment_id");
