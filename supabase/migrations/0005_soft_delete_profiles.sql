-- Soft delete support for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Index pour exclure rapidement les profils supprimés dans les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles (deleted_at)
  WHERE deleted_at IS NULL;
