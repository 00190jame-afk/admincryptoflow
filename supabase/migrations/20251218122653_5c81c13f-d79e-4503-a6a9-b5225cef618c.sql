-- Step 1: Add registered_with_invite_code_id column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS registered_with_invite_code_id uuid REFERENCES public.invite_codes(id);

-- Step 2: Update use_invite_code function to link users to invite codes
CREATE OR REPLACE FUNCTION public.use_invite_code(p_code text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Lock and get invite code
  SELECT * INTO invite_record
  FROM public.invite_codes
  WHERE code = trim(upper(p_code))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND current_uses < max_uses
  FOR UPDATE;
    
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update usage count
  UPDATE public.invite_codes
  SET 
    current_uses = current_uses + 1,
    updated_at = now()
  WHERE id = invite_record.id;
  
  -- Link user's profile to this invite code (this is the key fix!)
  UPDATE public.profiles
  SET registered_with_invite_code_id = invite_record.id
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

-- Step 3: Update get_admin_assigned_users to use both methods
CREATE OR REPLACE FUNCTION public.get_admin_assigned_users(p_admin_user_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Method 1: Users linked via profiles.registered_with_invite_code_id (new method)
  SELECT DISTINCT p.user_id
  FROM public.profiles p
  JOIN public.invite_codes ic ON p.registered_with_invite_code_id = ic.id
  WHERE ic.created_by = p_admin_user_id
     OR ic.code = (SELECT primary_invite_code FROM public.admin_profiles WHERE user_id = p_admin_user_id)
  
  UNION
  
  -- Method 2: Legacy - users linked via invite_codes.used_by (backwards compatibility)
  SELECT DISTINCT ic.used_by as user_id
  FROM public.invite_codes ic
  WHERE (ic.created_by = p_admin_user_id
     OR ic.code = (SELECT primary_invite_code FROM public.admin_profiles WHERE user_id = p_admin_user_id))
    AND ic.used_by IS NOT NULL;
$$;

-- Step 4: Backfill the lost user (hsue607@gmail.com -> waiyan's invite code)
UPDATE public.profiles
SET registered_with_invite_code_id = 'ff5b8bb8-2242-4dc5-8e79-25ae3bf19a14'
WHERE user_id = 'ba176509-71b7-40d7-a919-c5972334599d';