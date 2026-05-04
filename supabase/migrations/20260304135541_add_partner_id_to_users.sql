/*
  # Add partner_id to users table

  1. Changes
    - Add `partner_id` column to `users` table to link partner role users to their partner organization
    - Add foreign key constraint to `partners` table
    - This allows users with role 'partner' to be associated with a specific partner organization

  2. Security
    - No RLS changes needed, existing policies cover this
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE users ADD COLUMN partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN users.partner_id IS 'Partner organization associated with this user (for partner role users)';