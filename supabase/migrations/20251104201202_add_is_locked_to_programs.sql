/*
  # Add is_locked Column to Programs

  1. New Column
    - `is_locked` (boolean) - Indicates if the program is locked/closed for new submissions

  2. Notes
    - Default value is false (open for submissions)
    - When locked, no new projects can be submitted to this program
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE programs ADD COLUMN is_locked boolean DEFAULT false;
  END IF;
END $$;
