/*
  # Ajout des secteurs d'activite et champs projet supplementaires

  1. Nouvelles Tables
    - `activity_sectors`
      - `id` (uuid, primary key)
      - `name` (text, nom du secteur)
      - `description` (text, description optionnelle)
      - `is_active` (boolean, actif ou non)
      - `display_order` (integer, ordre d'affichage)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modifications Table users
    - Ajout colonne `phone` (text, numero de telephone)

  3. Modifications Table projects
    - Ajout colonne `project_description` (text, description detaillee du projet)
    - Ajout colonne `project_age_months` (integer, age du projet en mois)
    - Ajout colonne `activity_sector_id` (uuid, reference vers activity_sectors)
    - Ajout colonne `submitter_phone` (text, numero de telephone du soumissionnaire)

  4. Securite
    - RLS active sur activity_sectors
    - Policies pour lecture par tous les utilisateurs authentifies
    - Policies pour modification par admins/managers uniquement
*/

-- Creation de la table activity_sectors
CREATE TABLE IF NOT EXISTS activity_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE activity_sectors ENABLE ROW LEVEL SECURITY;

-- Politique: lecture pour tous les utilisateurs authentifies
CREATE POLICY "Authenticated users can read activity sectors"
  ON activity_sectors
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique: insertion pour admins/managers
CREATE POLICY "Admins and managers can insert activity sectors"
  ON activity_sectors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Politique: mise a jour pour admins/managers
CREATE POLICY "Admins and managers can update activity sectors"
  ON activity_sectors
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Politique: suppression pour admins uniquement
CREATE POLICY "Admins can delete activity sectors"
  ON activity_sectors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Ajout colonne phone a la table users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text;
  END IF;
END $$;

-- Ajout colonnes a la table projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_description'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_description text;
    COMMENT ON COLUMN projects.project_description IS 'Description detaillee du projet';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_age_months'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_age_months integer;
    COMMENT ON COLUMN projects.project_age_months IS 'Age du projet en mois';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'activity_sector_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN activity_sector_id uuid REFERENCES activity_sectors(id);
    COMMENT ON COLUMN projects.activity_sector_id IS 'Secteur d activite du projet';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'submitter_phone'
  ) THEN
    ALTER TABLE projects ADD COLUMN submitter_phone text;
    COMMENT ON COLUMN projects.submitter_phone IS 'Numero de telephone du soumissionnaire';
  END IF;
END $$;

-- Insertion de quelques secteurs par defaut
INSERT INTO activity_sectors (name, description, display_order) VALUES
  ('Agriculture', 'Activites agricoles et elevage', 1),
  ('Agro-transformation', 'Transformation de produits agricoles', 2),
  ('Numerique / Tech', 'Technologies de l information et communication', 3),
  ('Industrie legere', 'Production industrielle a petite echelle', 4),
  ('Commerce', 'Activites commerciales et distribution', 5),
  ('Services', 'Prestations de services divers', 6),
  ('Artisanat', 'Production artisanale', 7),
  ('Energie', 'Production et distribution d energie', 8),
  ('Environnement', 'Protection de l environnement et recyclage', 9),
  ('Sante', 'Services de sante et bien-etre', 10),
  ('Education', 'Formation et education', 11),
  ('Tourisme', 'Hotellerie et tourisme', 12)
ON CONFLICT DO NOTHING;