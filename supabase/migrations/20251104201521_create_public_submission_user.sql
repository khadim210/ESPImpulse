/*
  # Create Public Submission User

  1. New User
    - Create a system user for public submissions
    - Role: submitter
    - Used for all public form submissions

  2. Notes
    - This user represents all anonymous/public submissions
    - Projects submitted publicly will be assigned to this user
    - The actual submitter info is stored in formData._submitterInfo
*/

-- Create public submission system user with a specific UUID
INSERT INTO users (id, name, email, role, organization, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Système de soumission publique',
  'public-submissions@system.local',
  'submitter',
  'Système',
  true
)
ON CONFLICT (id) DO NOTHING;
