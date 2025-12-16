-- Fix get_admin_assigned_users function to properly find users registered with admin's invite codes
CREATE OR REPLACE FUNCTION public.get_admin_assigned_users(p_admin_user_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ic.used_by as user_id
  FROM public.invite_codes ic
  WHERE (
    -- Codes directly created by this admin
    ic.created_by = p_admin_user_id
    OR
    -- Codes matching admin's primary invite code
    ic.code = (SELECT primary_invite_code FROM public.admin_profiles WHERE user_id = p_admin_user_id)
  )
  AND ic.used_by IS NOT NULL;
$$;