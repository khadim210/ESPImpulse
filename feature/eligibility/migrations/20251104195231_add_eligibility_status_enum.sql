/*
  # Add Eligibility Status to Enum

  1. New Status Values
    - Add 'eligible' status to project_status enum
    - Add 'ineligible' status to project_status enum

  2. Notes
    - These new statuses are added between 'submitted' and 'under_review'
    - They represent the eligibility check phase
*/

-- Add 'eligible' status if not exists
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

-- Add 'ineligible' status if not exists
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
