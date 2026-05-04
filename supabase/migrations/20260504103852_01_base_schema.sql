/*
  # Schéma de base - R&D Impulse ! / ESP-UCAD

  1. Nouvelles Tables
    - `users` : comptes utilisateurs avec rôles (admin, partner, manager, submitter)
    - `partners` : organisations partenaires
    - `programs` : programmes de financement R&D
    - `form_templates` : modèles de formulaires configurables
    - `projects` : soumissions de projets

  2. Types ENUM
    - `user_role` : rôles des utilisateurs
    - `project_status` : statuts du cycle de vie des projets

  3. Sécurité
    - RLS activé sur toutes les tables
    - Fonctions helper : is_admin(), is_admin_or_manager()
    - Politiques restrictives par rôle
*/

-- =============================================
-- ENUMS
-- =============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'partner', 'manager', 'submitter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'draft', 'submitted', 'under_review', 'pre_selected',
    'selected', 'formalization', 'financed', 'monitoring', 'closed', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- TABLE: users
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'submitter',
  organization text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Insérer l'utilisateur public de soumission en premier
INSERT INTO users (id, name, email, role, organization, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Système de soumission publique',
  'public-submissions@system.local',
  'submitter',
  'Système',
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- FONCTIONS HELPER RLS
-- =============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- POLITIQUES RLS : users
-- =============================================

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR is_admin_or_manager());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE TO authenticated
  USING (is_admin());

-- =============================================
-- TABLE: partners
-- =============================================

CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contact_email text NOT NULL,
  contact_phone text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  assigned_manager_id uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read partners"
  ON partners FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert partners"
  ON partners FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update partners"
  ON partners FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can delete partners"
  ON partners FOR DELETE TO authenticated
  USING (is_admin());

-- =============================================
-- TABLE: form_templates
-- =============================================

CREATE TABLE IF NOT EXISTS form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  fields jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read form templates"
  ON form_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Public can read active form templates"
  ON form_templates FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Admins and managers can insert form templates"
  ON form_templates FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update form templates"
  ON form_templates FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can delete form templates"
  ON form_templates FOR DELETE TO authenticated
  USING (is_admin());

-- =============================================
-- TABLE: programs
-- =============================================

CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  form_template_id uuid REFERENCES form_templates(id) ON DELETE SET NULL,
  budget numeric(15,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'FCFA',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  selection_criteria jsonb DEFAULT '[]'::jsonb,
  evaluation_criteria jsonb DEFAULT '[]'::jsonb,
  eligibility_criteria text,
  field_eligibility_criteria jsonb DEFAULT '[]'::jsonb,
  custom_ai_prompt text,
  is_locked boolean DEFAULT false,
  locked_at timestamptz,
  locked_by uuid REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read programs"
  ON programs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Public can read active programs"
  ON programs FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Admins and managers can insert programs"
  ON programs FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update programs"
  ON programs FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can delete programs"
  ON programs FOR DELETE TO authenticated
  USING (is_admin());

-- =============================================
-- TABLE: projects
-- =============================================

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status project_status NOT NULL DEFAULT 'draft',
  budget numeric(15,2) NOT NULL DEFAULT 0,
  timeline text NOT NULL DEFAULT '',
  submitter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submission_date timestamptz,
  submitted_at timestamptz,
  evaluation_scores jsonb,
  evaluation_comments jsonb,
  total_evaluation_score integer,
  evaluation_notes text,
  evaluated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  evaluation_date timestamptz,
  formalization_completed boolean DEFAULT false,
  nda_signed boolean DEFAULT false,
  tags jsonb DEFAULT '[]'::jsonb,
  form_data jsonb,
  recommended_status text,
  manually_submitted boolean DEFAULT false,
  eligibility_notes text,
  eligibility_checked_by uuid REFERENCES users(id) ON DELETE SET NULL,
  eligibility_checked_at timestamptz,
  project_description text,
  project_age_months integer,
  submitter_phone text,
  submitter_name text,
  submitter_email text
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submitters can read own projects"
  ON projects FOR SELECT TO authenticated
  USING (
    submitter_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR is_admin_or_manager()
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN programs p ON p.partner_id = (
        SELECT partner_id FROM programs WHERE id = projects.program_id
      )
      WHERE u.auth_user_id = auth.uid() AND u.role = 'partner'
    )
  );

CREATE POLICY "Submitters can insert own projects"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (
    submitter_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR is_admin_or_manager()
  );

CREATE POLICY "Public can insert projects"
  ON projects FOR INSERT TO anon
  WITH CHECK (submitter_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Submitters can update own draft projects"
  ON projects FOR UPDATE TO authenticated
  USING (
    (submitter_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) AND status = 'draft')
    OR is_admin_or_manager()
  )
  WITH CHECK (
    (submitter_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) AND status = 'draft')
    OR is_admin_or_manager()
  );

CREATE POLICY "Admins and managers can delete projects"
  ON projects FOR DELETE TO authenticated
  USING (is_admin_or_manager());

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
