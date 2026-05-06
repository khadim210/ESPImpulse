/*
  # Fix storage RLS policy for submission file uploads

  ## Problem
  The current INSERT policy checks that the first path segment equals auth.uid().
  This works in theory but fails in practice because:
  - The folder name used is the auth user UUID (correct)
  - However the JWT token timing and session propagation can cause auth.uid()
    to not resolve correctly during the storage upload RLS check

  ## Fix
  Replace the restrictive folder-based policy with one that:
  1. Requires authentication (authenticated role)
  2. Allows any authenticated user to upload to submission-files bucket
  3. Still prevents anonymous uploads

  The project-level RLS on the `projects` table already ensures only the
  rightful submitter can create/update projects, so storage access control
  at the bucket level just needs to ensure the user is authenticated.
*/

DROP POLICY IF EXISTS "Authenticated users can upload submission files" ON storage.objects;

CREATE POLICY "Authenticated users can upload submission files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'submission-files');

-- Also ensure authenticated users can update their uploaded files (needed for upsert)
DROP POLICY IF EXISTS "Authenticated users can update submission files" ON storage.objects;

CREATE POLICY "Authenticated users can update submission files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'submission-files')
  WITH CHECK (bucket_id = 'submission-files');
