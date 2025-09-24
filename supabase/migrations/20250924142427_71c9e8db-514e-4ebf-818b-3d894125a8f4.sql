-- Update RLS policy for recharge_codes to use the new admin system
-- This allows admins from admin_profiles table to create recharge codes
DROP POLICY IF EXISTS "Admins can manage all recharge codes" ON public.recharge_codes;

CREATE POLICY "Admins can manage all recharge codes" 
ON public.recharge_codes 
FOR ALL 
USING (is_any_admin())
WITH CHECK (is_any_admin());