/*
  # Ajout de la politique UPDATE admin sur profiles

  Problème : les admins pouvaient lire et supprimer les profils mais pas les
  mettre à jour (seul "Users can update own profile" existait, limité à
  auth_user_id = auth.uid()). L'UPDATE réussissait mais le SELECT de retour
  renvoyait 0 lignes, causant l'erreur "Update failed - no data returned".

  Correction : on ajoute une politique UPDATE permettant aux admins de modifier
  n'importe quel profil.
*/

CREATE POLICY "Admins can update users"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
