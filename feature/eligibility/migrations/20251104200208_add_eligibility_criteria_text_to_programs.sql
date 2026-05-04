/*
  # Add Text Eligibility Criteria to Programs

  1. New Column
    - `eligibility_criteria` (text) - Free text eligibility criteria for the program

  2. Notes
    - This allows programs to have simple text-based eligibility criteria
    - Complements the existing field_eligibility_criteria (JSON-based criteria)
    - Used in the eligibility page to display criteria as checkable items
*/

-- Add eligibility_criteria column to programs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'eligibility_criteria'
  ) THEN
    ALTER TABLE programs ADD COLUMN eligibility_criteria text;
  END IF;
END $$;
