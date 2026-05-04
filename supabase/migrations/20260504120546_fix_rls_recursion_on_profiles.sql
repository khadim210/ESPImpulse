/*
  # Fix RLS stack depth / infinite recursion on profiles table

  ## Problem
  The RLS policy "Users can read own profile" on the `profiles` table uses
  `is_admin_or_manager()` which in turn queries `public.profiles`. Because RLS
  is active on `profiles`, that query re-evaluates the same policy, causing
  infinite recursion (error 54001 "stack depth limit exceeded").

  ## Fix
  Redefine `is_admin()` and `is_admin_or_manager()` as SECURITY DEFINER
  functions with an explicit `SET search_path = public`. SECURITY DEFINER
  functions run as the function owner (postgres), bypassing RLS on the tables
  they query — breaking the recursion cycle.

  No data is changed; only function definitions are replaced.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager')
  );
$$;
