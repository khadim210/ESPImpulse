/*
  # Allow public read access to active activity sectors

  1. Changes
    - Add RLS policy to allow anonymous users to read active activity sectors
    - This is needed for the public submission form where users select their activity sector before being authenticated

  2. Security
    - Only allows SELECT operations
    - Only returns sectors that are marked as active (is_active = true)
    - Does not expose inactive sectors to public users
*/

CREATE POLICY "Public can read active activity sectors"
  ON activity_sectors
  FOR SELECT
  TO anon
  USING (is_active = true);
