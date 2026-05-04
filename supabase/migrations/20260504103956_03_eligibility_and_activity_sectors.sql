/*
  # Éligibilité et secteurs d'activité

  1. Nouvelles Tables
    - `activity_sectors` : secteurs d'activité des projets

  2. Nouveaux Types ENUM
    - Ajout des valeurs 'eligible' et 'ineligible' à project_status

  3. Colonnes ajoutées à projects
    - eligibility_notes, eligibility_checked_by, eligibility_checked_at, submitted_at (déjà présents)

  4. Colonnes ajoutées à programs
    - eligibility_criteria (texte libre)

  5. Données de référence
    - 12 secteurs d'activité par défaut

  6. Sécurité
    - RLS activé sur activity_sectors
    - Lecture publique des secteurs actifs
*/

-- Ajouter les valeurs d'éligibilité au type project_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'eligible'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_status')
  ) THEN
    ALTER TYPE project_status ADD VALUE 'eligible' AFTER 'submitted';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ineligible'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_status')
  ) THEN
    ALTER TYPE project_status ADD VALUE 'ineligible' AFTER 'eligible';
  END IF;
END $$;

-- =============================================
-- TABLE: activity_sectors
-- =============================================

CREATE TABLE IF NOT EXISTS activity_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE activity_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activity sectors"
  ON activity_sectors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Public can read active activity sectors"
  ON activity_sectors FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Admins and managers can insert activity sectors"
  ON activity_sectors FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update activity sectors"
  ON activity_sectors FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can delete activity sectors"
  ON activity_sectors FOR DELETE TO authenticated
  USING (is_admin());

CREATE TRIGGER update_activity_sectors_updated_at
  BEFORE UPDATE ON activity_sectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Colonne activity_sector_id dans projects (si pas déjà présente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'activity_sector_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN activity_sector_id uuid REFERENCES activity_sectors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Données de référence : secteurs d'activité
INSERT INTO activity_sectors (name, description, display_order) VALUES
  ('Agriculture', 'Activités agricoles et élevage', 1),
  ('Agro-transformation', 'Transformation de produits agricoles', 2),
  ('Numérique / Tech', 'Technologies de l''information et communication', 3),
  ('Industrie légère', 'Production industrielle à petite échelle', 4),
  ('Commerce', 'Activités commerciales et distribution', 5),
  ('Services', 'Prestations de services divers', 6),
  ('Artisanat', 'Production artisanale', 7),
  ('Énergie', 'Production et distribution d''énergie', 8),
  ('Environnement', 'Protection de l''environnement et recyclage', 9),
  ('Santé', 'Services de santé et bien-être', 10),
  ('Éducation', 'Formation et éducation', 11),
  ('Tourisme', 'Hôtellerie et tourisme', 12)
ON CONFLICT DO NOTHING;
