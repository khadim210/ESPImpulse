/*
  # Fix RLS policy to allow draft promotion to submitted

  ## Problem
  The current UPDATE policy for submitters checks `status = 'draft'` in both
  USING and WITH CHECK clauses. This means a submitter cannot change a draft's
  status to 'submitted' because the WITH CHECK fails after the update.

  ## Fix
  - USING clause: submitter can only UPDATE rows that are currently in 'draft' status
  - WITH CHECK clause: after the update, status must be either 'draft' (still saving)
    or 'submitted' (final submission) — nothing else

  This prevents submitters from setting arbitrary statuses while allowing the
  draft → submitted transition.
*/

DROP POLICY IF EXISTS "Submitters can update own draft projects" ON projects;

CREATE POLICY "Submitters can update own draft projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (
    (
      submitter_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'draft'
    )
    OR is_admin_or_manager()
  )
  WITH CHECK (
    (
      submitter_id IN (
        SELECT id FROM profiles WHERE auth_user_id = auth.uid()
      )
      AND status IN ('draft', 'submitted')
    )
    OR is_admin_or_manager()
  );
