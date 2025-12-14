-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage trade rules" ON public.trade_rules;

-- Create new policy for Super Admins only
CREATE POLICY "Super admins can manage trade rules"
ON public.trade_rules
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());