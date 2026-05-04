/*
  # Ajout des politiques RLS manquantes

  1. Modifications
    - `document_requests`: Ajout politique DELETE pour admin/manager
    - `document_submissions`: Ajout politique DELETE pour admin/manager
    - `project_status_history`: Ajout politiques INSERT pour system et DELETE pour admin

  2. Securite
    - Toutes les politiques sont restrictives par defaut
    - Seuls les admin/manager peuvent supprimer des enregistrements sensibles
    - L'historique des statuts est protege contre les modifications non autorisees
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'document_requests' 
    AND policyname = 'Admins and managers can delete document requests'
  ) THEN
    CREATE POLICY "Admins and managers can delete document requests"
      ON document_requests
      FOR DELETE
      TO authenticated
      USING (is_admin_or_manager());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'document_submissions' 
    AND policyname = 'Admins and managers can delete document submissions'
  ) THEN
    CREATE POLICY "Admins and managers can delete document submissions"
      ON document_submissions
      FOR DELETE
      TO authenticated
      USING (is_admin_or_manager());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_status_history' 
    AND policyname = 'System can insert status history'
  ) THEN
    CREATE POLICY "System can insert status history"
      ON project_status_history
      FOR INSERT
      TO authenticated
      WITH CHECK (is_admin_or_manager());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_status_history' 
    AND policyname = 'Admins can delete status history'
  ) THEN
    CREATE POLICY "Admins can delete status history"
      ON project_status_history
      FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;
