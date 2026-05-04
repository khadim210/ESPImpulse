/*
  # Add submitter name to projects table

  1. Changes
    - Add `submitter_name` column to `projects` table to store the project owner's name
    - This allows displaying the project owner's name without needing to join with the users table

  2. Notes
    - Column is nullable to maintain backwards compatibility with existing projects
    - Existing projects can be updated to populate this field from the users table
*/

ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitter_name text;

UPDATE projects p
SET submitter_name = u.name
FROM users u
WHERE p.submitter_id = u.id
  AND p.submitter_name IS NULL;