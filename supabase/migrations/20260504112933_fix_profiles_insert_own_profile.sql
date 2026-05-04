/*
  # Fix profiles INSERT policy for self-registration

  ## Problem
  The existing INSERT policy only allows admins to create profiles.
  When a new user registers (e.g. via the public submission form), the code
  calls UserService.createUser() with the authenticated anon/user client,
  which is blocked by RLS with code 42501.

  ## Change
  Add a policy that lets a newly authenticated user insert exactly one profile
  row where auth_user_id matches their own auth.uid().
  The existing "Admins can insert users" policy is kept intact for admin-created accounts.
*/

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());
