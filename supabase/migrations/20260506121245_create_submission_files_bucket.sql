/*
  # Create submission-files storage bucket

  ## Summary
  Creates the missing `submission-files` storage bucket used by the public
  submission form when soumissionnaires upload files.

  ## Changes
  - Creates bucket `submission-files` (private, 10 MB file size limit)
  - INSERT policy: any authenticated user can upload to their own folder
  - SELECT policy: authenticated users can read files in their own folder,
    admins/managers can read all files
  - DELETE policy: admins and managers only

  ## Notes
  - The bucket is private (signed URLs are used, not public URLs)
  - Files are stored under `{userId}/{filename}` paths
  - The public submission flow authenticates the user before uploading,
    so `auth.uid()` is always available at upload time
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-files',
  'submission-files',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- INSERT: authenticated users can only upload into their own folder
CREATE POLICY "Authenticated users can upload submission files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'submission-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: users read their own files; admins/managers read all
CREATE POLICY "Users can read own submission files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'submission-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.auth_user_id = auth.uid()
          AND profiles.role IN ('admin', 'manager')
      )
    )
  );

-- DELETE: admins and managers only
CREATE POLICY "Admins and managers can delete submission files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'submission-files'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );
