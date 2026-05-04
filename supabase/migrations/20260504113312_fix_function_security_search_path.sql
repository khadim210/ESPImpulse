/*
  # Fix function security issues

  ## Issues addressed
  1. Mutable search_path on all 4 public functions — fixed by adding SET search_path = ''
     and qualifying all object references with their schema.
  2. is_admin() and is_admin_or_manager() are SECURITY DEFINER and executable by anon/authenticated
     via RPC — fixed by:
     - Switching to SECURITY INVOKER (they only read from profiles using auth.uid(), so
       SECURITY INVOKER is safe and correct)
     - Revoking EXECUTE from public/anon on both functions
  3. update_updated_at_column and update_system_parameters_updated_at are already SECURITY INVOKER
     but need SET search_path = '' to silence the mutable search_path warning.
*/

-- ── is_admin ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── is_admin_or_manager ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

-- ── update_updated_at_column ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── update_system_parameters_updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_system_parameters_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
