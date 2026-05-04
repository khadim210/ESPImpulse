/*
  # Tables de formalisation et suivi

  1. Nouvelles Tables
    - `project_status_history` : historique complet des changements de statut
    - `document_requests` : demandes de documents dans le processus de formalisation
    - `document_submissions` : soumissions de documents par les porteurs de projet
    - `technical_support` : accompagnement technique des projets sélectionnés
    - `disbursement_plan` : plan de décaissement financier
    - `disbursement_tranches` : tranches individuelles de décaissement
    - `project_archives` : archives et exports des projets

  2. Sécurité
    - RLS activé sur toutes les tables
    - Accès restreint selon le rôle
*/

-- =============================================
-- TABLE: project_status_history
-- =============================================

CREATE TABLE IF NOT EXISTS project_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  comment text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE project_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read status history"
  ON project_status_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert status history"
  ON project_status_history FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can delete status history"
  ON project_status_history FOR DELETE TO authenticated
  USING (is_admin());

-- =============================================
-- TABLE: document_requests
-- =============================================

CREATE TABLE IF NOT EXISTS document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  requested_at timestamptz DEFAULT now(),
  due_date timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'validated', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read document requests"
  ON document_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert document requests"
  ON document_requests FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update document requests"
  ON document_requests FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete document requests"
  ON document_requests FOR DELETE TO authenticated
  USING (is_admin_or_manager());

CREATE TRIGGER update_document_requests_updated_at
  BEFORE UPDATE ON document_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLE: document_submissions
-- =============================================

CREATE TABLE IF NOT EXISTS document_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  submitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  submitted_at timestamptz DEFAULT now(),
  validation_status text NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'approved', 'rejected')),
  validation_notes text,
  validated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  validated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read document submissions"
  ON document_submissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Submitters can insert document submissions"
  ON document_submissions FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR is_admin_or_manager()
  );

CREATE POLICY "Admins and managers can update document submissions"
  ON document_submissions FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete document submissions"
  ON document_submissions FOR DELETE TO authenticated
  USING (is_admin_or_manager());

-- =============================================
-- TABLE: technical_support
-- =============================================

CREATE TABLE IF NOT EXISTS technical_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  support_type text NOT NULL DEFAULT 'conseil'
    CHECK (support_type IN ('formation', 'conseil', 'mentoring', 'autre')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  scheduled_date timestamptz,
  duration_hours numeric(5,2) DEFAULT 0,
  provider text,
  participants text,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  completion_notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE technical_support ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read technical support"
  ON technical_support FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert technical support"
  ON technical_support FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update technical support"
  ON technical_support FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete technical support"
  ON technical_support FOR DELETE TO authenticated
  USING (is_admin_or_manager());

CREATE TRIGGER update_technical_support_updated_at
  BEFORE UPDATE ON technical_support
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLE: disbursement_plan
-- =============================================

CREATE TABLE IF NOT EXISTS disbursement_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'FCFA',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE disbursement_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read disbursement plans"
  ON disbursement_plan FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert disbursement plans"
  ON disbursement_plan FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update disbursement plans"
  ON disbursement_plan FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete disbursement plans"
  ON disbursement_plan FOR DELETE TO authenticated
  USING (is_admin_or_manager());

CREATE TRIGGER update_disbursement_plan_updated_at
  BEFORE UPDATE ON disbursement_plan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLE: disbursement_tranches
-- =============================================

CREATE TABLE IF NOT EXISTS disbursement_tranches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES disbursement_plan(id) ON DELETE CASCADE,
  tranche_number integer NOT NULL,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  percentage numeric(5,2) DEFAULT 0,
  scheduled_date timestamptz,
  conditions text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'disbursed', 'cancelled')),
  actual_disbursement_date timestamptz,
  actual_amount numeric(15,2),
  disbursement_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE disbursement_tranches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read disbursement tranches"
  ON disbursement_tranches FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert disbursement tranches"
  ON disbursement_tranches FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update disbursement tranches"
  ON disbursement_tranches FOR UPDATE TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete disbursement tranches"
  ON disbursement_tranches FOR DELETE TO authenticated
  USING (is_admin_or_manager());

CREATE TRIGGER update_disbursement_tranches_updated_at
  BEFORE UPDATE ON disbursement_tranches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLE: project_archives
-- =============================================

CREATE TABLE IF NOT EXISTS project_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  archive_type text NOT NULL DEFAULT 'backup'
    CHECK (archive_type IN ('closure', 'export', 'backup')),
  archive_path text NOT NULL,
  archive_size bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'deleted')),
  archived_by uuid REFERENCES users(id) ON DELETE SET NULL,
  archived_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can read project archives"
  ON project_archives FOR SELECT TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Admins and managers can insert project archives"
  ON project_archives FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can delete project archives"
  ON project_archives FOR DELETE TO authenticated
  USING (is_admin());
