-- Step 1: Add admin_name column to invite_codes table
ALTER TABLE public.invite_codes 
ADD COLUMN admin_name TEXT;

-- Step 2: Update max_uses default to 100 for new codes
ALTER TABLE public.invite_codes 
ALTER COLUMN max_uses SET DEFAULT 100;

-- Step 3: Create temporary table to consolidate codes per admin
CREATE TEMP TABLE admin_consolidated_codes AS
WITH first_codes AS (
  SELECT DISTINCT ON (ap.user_id) 
    ic.id as keep_code_id,
    ic.code as keep_code,
    ap.user_id,
    ap.full_name,
    ap.email
  FROM admin_profiles ap
  CROSS JOIN UNNEST(ap.assigned_invite_codes) AS assigned_code
  JOIN invite_codes ic ON ic.code = assigned_code
  WHERE ap.is_active = true
  ORDER BY ap.user_id, ic.created_at
)
SELECT * FROM first_codes;

-- Step 4: Update the kept codes with admin names and max_uses = 100
UPDATE public.invite_codes 
SET 
  admin_name = acc.full_name,
  max_uses = 100
FROM admin_consolidated_codes acc
WHERE invite_codes.id = acc.keep_code_id;

-- Step 5: Delete redundant codes (keep only first code per admin)
DELETE FROM public.invite_codes 
WHERE id NOT IN (
  SELECT keep_code_id FROM admin_consolidated_codes
) 
AND created_by IN (
  SELECT user_id FROM admin_profiles WHERE is_active = true
);

-- Step 6: Update admin_profiles to store single code instead of array
ALTER TABLE public.admin_profiles 
ADD COLUMN primary_invite_code TEXT;

-- Step 7: Populate primary_invite_code with the consolidated code
UPDATE public.admin_profiles 
SET primary_invite_code = acc.keep_code
FROM admin_consolidated_codes acc
WHERE admin_profiles.user_id = acc.user_id;

-- Step 8: Remove the old assigned_invite_codes array column
ALTER TABLE public.admin_profiles 
DROP COLUMN assigned_invite_codes;

-- Step 9: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_admin_name ON public.invite_codes(admin_name);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON public.invite_codes(created_by);

-- Step 10: Update the register_admin_with_invite function to work with new structure
CREATE OR REPLACE FUNCTION public.register_admin_with_invite(
  p_email text, 
  p_user_id uuid, 
  p_full_name text, 
  p_admin_invite_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code RECORD;
  v_result jsonb;
  v_new_code text;
BEGIN
  -- Validate the admin invite code
  SELECT * INTO v_invite_code
  FROM public.admin_invite_codes
  WHERE code = trim(upper(p_admin_invite_code))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND used_by IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired admin invite code');
  END IF;

  -- Generate single invite code for the new admin
  SELECT public.generate_invite_code() INTO v_new_code;
  
  -- Insert the invite code with max_uses = 100
  INSERT INTO public.invite_codes (
    code,
    created_by,
    max_uses,
    expires_at,
    admin_name
  ) VALUES (
    v_new_code,
    p_user_id,
    100, -- Max 100 users per admin
    now() + interval '1 year', -- Codes expire in 1 year
    p_full_name
  );

  -- Create admin profile with single invite code
  INSERT INTO public.admin_profiles (
    user_id,
    email,
    full_name,
    role,
    is_active,
    primary_invite_code
  ) VALUES (
    p_user_id,
    p_email,
    p_full_name,
    v_invite_code.role,
    true,
    v_new_code
  );

  -- Create regular profile for the admin user
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    p_user_id,
    split_part(p_full_name, ' ', 1),
    CASE 
      WHEN array_length(string_to_array(p_full_name, ' '), 1) > 1 
      THEN split_part(p_full_name, ' ', 2) 
      ELSE '' 
    END,
    p_email
  );

  -- Create initial balance for admin user
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (p_user_id, 0.00);

  -- Mark admin invite code as used
  UPDATE public.admin_invite_codes
  SET 
    used_by = p_user_id,
    used_at = now()
  WHERE id = v_invite_code.id;

  -- Return success with generated code
  RETURN jsonb_build_object(
    'success', true, 
    'role', v_invite_code.role,
    'invite_code', v_new_code,
    'message', 'Admin profile created successfully with invite code: ' || v_new_code
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN jsonb_build_object(
    'success', false, 
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;