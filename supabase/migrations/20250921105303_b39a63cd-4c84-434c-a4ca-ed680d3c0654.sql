-- Fix missing assigned invite codes for existing admins
CREATE OR REPLACE FUNCTION public.fix_admin_assigned_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_record RECORD;
  v_generated_codes text[];
  v_new_code text;
  i integer;
  v_code_count integer := 5;
BEGIN
  -- Loop through all admins who don't have assigned invite codes
  FOR admin_record IN 
    SELECT user_id, email, full_name 
    FROM public.admin_profiles 
    WHERE (assigned_invite_codes IS NULL OR array_length(assigned_invite_codes, 1) IS NULL)
      AND is_active = true
  LOOP
    -- Generate invite codes for this admin
    v_generated_codes := ARRAY[]::text[];
    FOR i IN 1..v_code_count LOOP
      SELECT public.generate_invite_code() INTO v_new_code;
      
      -- Insert the invite code
      INSERT INTO public.invite_codes (
        code,
        created_by,
        max_uses,
        expires_at
      ) VALUES (
        v_new_code,
        admin_record.user_id,
        10, -- Each code can be used 10 times
        now() + interval '1 year' -- Codes expire in 1 year
      );
      
      v_generated_codes := array_append(v_generated_codes, v_new_code);
    END LOOP;

    -- Update admin profile with assigned invite codes
    UPDATE public.admin_profiles
    SET assigned_invite_codes = v_generated_codes,
        updated_at = now()
    WHERE user_id = admin_record.user_id;
    
    RAISE NOTICE 'Generated % invite codes for admin: %', v_code_count, admin_record.email;
  END LOOP;
END;
$$;

-- Execute the fix function
SELECT public.fix_admin_assigned_codes();

-- Drop the function after use (cleanup)
DROP FUNCTION public.fix_admin_assigned_codes();