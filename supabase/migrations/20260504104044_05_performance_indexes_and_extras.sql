/*
  # Index de performance, colonnes supplémentaires et bucket de stockage

  1. Colonnes supplémentaires
    - users.phone (téléphone)
    - users.partner_id (lien vers partenaire)
    - projects.project_description, project_age_months, submitter_phone (déjà dans base)

  2. Index de performance
    - Sur projects, users, activity_sectors, form_templates, partners, programs
    - Sur document_requests, technical_support, disbursement_tranches, project_status_history

  3. Index d'éligibilité
    - Filtre partiel sur les statuts d'éligibilité

  4. Bucket de stockage
    - formalization-documents pour les pièces jointes
*/

-- Colonnes supplémentaires users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE users ADD COLUMN partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================
-- INDEX DE PERFORMANCE
-- =============================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_partner_id ON users(partner_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;

-- partners
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active) WHERE is_active = true;

-- programs
CREATE INDEX IF NOT EXISTS idx_programs_partner_id ON programs(partner_id);
CREATE INDEX IF NOT EXISTS idx_programs_is_active ON programs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_programs_start_date ON programs(start_date);
CREATE INDEX IF NOT EXISTS idx_programs_end_date ON programs(end_date);
CREATE INDEX IF NOT EXISTS idx_programs_partner_active ON programs(partner_id, is_active);

-- form_templates
CREATE INDEX IF NOT EXISTS idx_form_templates_is_active ON form_templates(is_active) WHERE is_active = true;

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_submitter_id ON projects(submitter_id);
CREATE INDEX IF NOT EXISTS idx_projects_program_id ON projects(program_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_activity_sector_id ON projects(activity_sector_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_submission_date ON projects(submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_projects_recommended_status ON projects(recommended_status);
CREATE INDEX IF NOT EXISTS idx_projects_program_status ON projects(program_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_status_created_at ON projects(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_eligibility_status ON projects(status)
  WHERE status IN ('submitted', 'eligible', 'ineligible');

-- activity_sectors
CREATE INDEX IF NOT EXISTS idx_activity_sectors_is_active ON activity_sectors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_activity_sectors_display_order ON activity_sectors(display_order);

-- project_status_history
CREATE INDEX IF NOT EXISTS idx_project_status_history_project_id ON project_status_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_status_history_project_date ON project_status_history(project_id, changed_at DESC);

-- document_requests
CREATE INDEX IF NOT EXISTS idx_document_requests_project_id ON document_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_due_date ON document_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_document_requests_document_type ON document_requests(document_type);
CREATE INDEX IF NOT EXISTS idx_document_requests_project_status ON document_requests(project_id, status);

-- document_submissions
CREATE INDEX IF NOT EXISTS idx_document_submissions_request_id ON document_submissions(request_id);

-- technical_support
CREATE INDEX IF NOT EXISTS idx_technical_support_project_id ON technical_support(project_id);
CREATE INDEX IF NOT EXISTS idx_technical_support_scheduled_date ON technical_support(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_technical_support_support_type ON technical_support(support_type);
CREATE INDEX IF NOT EXISTS idx_technical_support_project_status ON technical_support(project_id, status);

-- disbursement_plan
CREATE INDEX IF NOT EXISTS idx_disbursement_plan_project_id ON disbursement_plan(project_id);

-- disbursement_tranches
CREATE INDEX IF NOT EXISTS idx_disbursement_tranches_plan_id ON disbursement_tranches(plan_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_tranches_status ON disbursement_tranches(status);

-- project_archives
CREATE INDEX IF NOT EXISTS idx_project_archives_project_id ON project_archives(project_id);

-- =============================================
-- BUCKET DE STOCKAGE
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('formalization-documents', 'formalization-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Politique de stockage : upload par utilisateurs authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can upload formalization documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload formalization documents"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'formalization-documents');
  END IF;
END $$;

-- Politique de stockage : lecture par utilisateurs authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can read formalization documents'
  ) THEN
    CREATE POLICY "Authenticated users can read formalization documents"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'formalization-documents');
  END IF;
END $$;
