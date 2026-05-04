/*
  # Fix all foreign keys referencing auth.users

  1. Changes
    - Update foreign keys on document_submissions, technical_support, disbursement_plan, 
      and project_archives to reference public.users instead of auth.users
    
  2. Reason
    - The application uses public.users.id for user identification
    - The constraints referencing auth.users.id caused insert failures
*/

-- Fix document_submissions.validated_by
ALTER TABLE document_submissions 
DROP CONSTRAINT IF EXISTS document_submissions_validated_by_fkey;

ALTER TABLE document_submissions 
ADD CONSTRAINT document_submissions_validated_by_fkey 
FOREIGN KEY (validated_by) REFERENCES public.users(id);

-- Fix technical_support.created_by
ALTER TABLE technical_support 
DROP CONSTRAINT IF EXISTS technical_support_created_by_fkey;

ALTER TABLE technical_support 
ADD CONSTRAINT technical_support_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Fix disbursement_plan.created_by
ALTER TABLE disbursement_plan 
DROP CONSTRAINT IF EXISTS disbursement_plan_created_by_fkey;

ALTER TABLE disbursement_plan 
ADD CONSTRAINT disbursement_plan_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Fix project_archives.archived_by
ALTER TABLE project_archives 
DROP CONSTRAINT IF EXISTS project_archives_archived_by_fkey;

ALTER TABLE project_archives 
ADD CONSTRAINT project_archives_archived_by_fkey 
FOREIGN KEY (archived_by) REFERENCES public.users(id);
