/*
  # Add Program Lock Fields

  1. New Columns
    - `is_locked` (boolean) - Indicates if the program is locked/closed for new submissions
    - `locked_at` (timestamptz) - Timestamp when the program was locked
    - `locked_by` (uuid) - Reference to the user who locked the program

  2. Notes
    - Default value for is_locked is false (open for submissions)
    - When locked, no new projects can be submitted to this program
    - locked_at and locked_by are set when the program is locked
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE programs ADD COLUMN is_locked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE programs ADD COLUMN locked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'locked_by'
  ) THEN
    ALTER TABLE programs ADD COLUMN locked_by uuid REFERENCES users(id);
  END IF;
END $$;