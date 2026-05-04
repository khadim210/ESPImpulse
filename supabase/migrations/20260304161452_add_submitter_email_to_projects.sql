/*
  # Ajout du champ email du soumetteur aux projets

  1. Modifications
    - Ajout de la colonne `submitter_email` a la table `projects`
    - Cette colonne stocke l'email du porteur de projet pour faciliter les exports

  2. Notes
    - Colonne optionnelle (nullable)
    - Permet d'avoir l'email du porteur directement dans le projet
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'submitter_email'
  ) THEN
    ALTER TABLE projects ADD COLUMN submitter_email text;
  END IF;
END $$;
