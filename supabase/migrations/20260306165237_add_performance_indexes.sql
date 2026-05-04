/*
  # Add Performance Indexes

  1. Purpose
    - Improve query performance on frequently accessed columns
    - Optimize filtering, sorting, and JOIN operations
    
  2. New Indexes
    - projects: activity_sector_id, created_at, submission_date, recommended_status
    - users: partner_id, is_active
    - activity_sectors: is_active, display_order
    - form_templates: is_active
    - partners: is_active
    - programs: is_active, start_date, end_date
    - document_requests: due_date, document_type
    - technical_support: scheduled_date, support_type
    
  3. Composite Indexes
    - projects: (program_id, status) for common filtering
    - projects: (status, created_at) for dashboard queries
    - document_requests: (project_id, status) for formalization page
    - technical_support: (project_id, status) for formalization page
*/

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_activity_sector_id 
  ON projects(activity_sector_id);

CREATE INDEX IF NOT EXISTS idx_projects_created_at 
  ON projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_submission_date 
  ON projects(submission_date DESC);

CREATE INDEX IF NOT EXISTS idx_projects_recommended_status 
  ON projects(recommended_status);

CREATE INDEX IF NOT EXISTS idx_projects_program_status 
  ON projects(program_id, status);

CREATE INDEX IF NOT EXISTS idx_projects_status_created_at 
  ON projects(status, created_at DESC);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_partner_id 
  ON users(partner_id);

CREATE INDEX IF NOT EXISTS idx_users_is_active 
  ON users(is_active) WHERE is_active = true;

-- Activity sectors table indexes
CREATE INDEX IF NOT EXISTS idx_activity_sectors_is_active 
  ON activity_sectors(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_activity_sectors_display_order 
  ON activity_sectors(display_order);

-- Form templates table indexes
CREATE INDEX IF NOT EXISTS idx_form_templates_is_active 
  ON form_templates(is_active) WHERE is_active = true;

-- Partners table indexes
CREATE INDEX IF NOT EXISTS idx_partners_is_active 
  ON partners(is_active) WHERE is_active = true;

-- Programs table indexes
CREATE INDEX IF NOT EXISTS idx_programs_is_active 
  ON programs(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_programs_start_date 
  ON programs(start_date);

CREATE INDEX IF NOT EXISTS idx_programs_end_date 
  ON programs(end_date);

CREATE INDEX IF NOT EXISTS idx_programs_partner_active 
  ON programs(partner_id, is_active);

-- Document requests table indexes
CREATE INDEX IF NOT EXISTS idx_document_requests_due_date 
  ON document_requests(due_date);

CREATE INDEX IF NOT EXISTS idx_document_requests_document_type 
  ON document_requests(document_type);

CREATE INDEX IF NOT EXISTS idx_document_requests_project_status 
  ON document_requests(project_id, status);

-- Technical support table indexes
CREATE INDEX IF NOT EXISTS idx_technical_support_scheduled_date 
  ON technical_support(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_technical_support_support_type 
  ON technical_support(support_type);

CREATE INDEX IF NOT EXISTS idx_technical_support_project_status 
  ON technical_support(project_id, status);

-- Disbursement tranches index for status filtering
CREATE INDEX IF NOT EXISTS idx_disbursement_tranches_status 
  ON disbursement_tranches(status);

-- Project status history index for date range queries
CREATE INDEX IF NOT EXISTS idx_project_status_history_project_date 
  ON project_status_history(project_id, changed_at DESC);
