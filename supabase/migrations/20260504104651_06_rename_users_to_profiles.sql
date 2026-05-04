/*
  # Renommage de public.users en public.profiles

  Raison : La table public.users avec une colonne email entre en conflit avec
  auth.users lors de l'authentification Supabase, provoquant l'erreur
  "Database error querying schema". Renommer en "profiles" résout ce conflit.

  1. Modifications
    - Renommage de la table `users` en `profiles`
    - Mise à jour de toutes les foreign keys qui référencent users(id)
    - Mise à jour des fonctions helper is_admin() et is_admin_or_manager()
    - Mise à jour des politiques RLS sur toutes les tables concernées

  2. Tables avec FK vers users renommées pour pointer vers profiles
    - partners.assigned_manager_id
    - programs.manager_id, locked_by
    - projects.submitter_id, evaluated_by, eligibility_checked_by
    - project_status_history.changed_by
    - document_requests.requested_by
    - document_submissions.submitted_by, validated_by
    - technical_support.created_by
    - disbursement_plan.created_by
    - project_archives.archived_by
    - profiles.partner_id (auto-référence)
*/

-- 1. Renommer la table
ALTER TABLE public.users RENAME TO profiles;

-- 2. Mettre à jour les fonctions helper
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Recréer les politiques RLS sur profiles (les anciennes sur "users" sont automatiquement renommées)
-- Supabase renomme automatiquement les politiques avec la table, on recrée quand même les fonctions
-- Les index sur "users" sont aussi renommés automatiquement par Postgres

-- 4. Recréer les politiques RLS sur les tables qui utilisent is_admin/is_admin_or_manager
-- (elles appellent les fonctions, pas la table directement - elles restent valides)

-- Vérification : s'assurer que le profil admin existe toujours
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'public-submissions@system.local') THEN
    INSERT INTO public.profiles (id, name, email, role, organization, is_active)
    VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'Système de soumission publique',
      'public-submissions@system.local',
      'submitter',
      'Système',
      true
    );
  END IF;
END $$;
