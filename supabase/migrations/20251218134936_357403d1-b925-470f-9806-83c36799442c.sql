-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Admins can view their own profile" ON admin_profiles;

-- Create a PERMISSIVE policy that allows authenticated users to check their own admin profile
CREATE POLICY "Users can check own admin profile"
ON admin_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);