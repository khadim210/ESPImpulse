/*
  # Add Eligibility Fields to Projects Table

  1. New Columns
    - `eligibility_notes` (text) - Notes about eligibility check
    - `eligibility_checked_by` (uuid) - User who checked eligibility
    - `eligibility_checked_at` (timestamptz) - When eligibility was checked
    - `submitted_at` (timestamptz) - When project was submitted

  2. Indexes
    - Index on status for eligibility queries
    - Index on eligibility_checked_at

  3. Notes
    - These fields help track the eligibility verification process
    - Eligibility check happens after submission and before evaluation
*/

-- Add eligibility tracking columns to projects table
DO $$
BEGIN
  -- Add eligibility_notes column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'eligibility_notes'
  ) THEN
    ALTER TABLE projects ADD COLUMN eligibility_notes text;
  END IF;

  -- Add eligibility_checked_by column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'eligibility_checked_by'
  ) THEN
    ALTER TABLE projects ADD COLUMN eligibility_checked_by uuid REFERENCES users(id);
  END IF;

  -- Add eligibility_checked_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'eligibility_checked_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN eligibility_checked_at timestamptz;
  END IF;

  -- Add submitted_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN submitted_at timestamptz;
  END IF;
END $$;

-- Update existing submitted projects to have submitted_at date
UPDATE projects
SET submitted_at = submission_date
WHERE status = 'submitted' AND submitted_at IS NULL AND submission_date IS NOT NULL;

-- Create index for eligibility queries
CREATE INDEX IF NOT EXISTS idx_projects_eligibility_status ON projects(status) WHERE status IN ('submitted', 'eligible', 'ineligible');
CREATE INDEX IF NOT EXISTS idx_projects_eligibility_checked_at ON projects(eligibility_checked_at);
