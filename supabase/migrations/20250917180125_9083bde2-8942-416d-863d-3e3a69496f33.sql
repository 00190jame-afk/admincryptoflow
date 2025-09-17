-- Fix security vulnerability: Remove overly permissive invite codes policy
-- that allows anyone to view all active invite codes

-- Drop the insecure policy that exposes all active codes
DROP POLICY IF EXISTS "Users can validate invite codes" ON public.invite_codes;

-- Keep the policy that allows users to view codes they created
-- (this policy already exists: "Users can view their created invite codes")

-- Add a more secure policy for admins to manage invite codes
CREATE POLICY "Admins can manage all invite codes" 
ON public.invite_codes 
FOR ALL 
USING (is_any_admin())
WITH CHECK (is_any_admin());

-- Note: Code validation should only happen through the validate_invite_code() 
-- and use_invite_code() functions, not through direct SELECT queries