-- First, let's update the handle_new_user function to detect admin invite codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  admin_invite_code TEXT;
  registration_result JSONB;
BEGIN
  -- Check if user registered with admin invite code
  admin_invite_code := NEW.raw_user_meta_data ->> 'admin_invite_code';
  
  IF admin_invite_code IS NOT NULL AND admin_invite_code != '' THEN
    -- This is an admin registration
    SELECT public.register_admin_with_invite(
      NEW.email,
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        CONCAT(
          COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
          ' ',
          COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
        )
      ),
      admin_invite_code
    ) INTO registration_result;
    
    -- If admin registration failed, log it but don't block user creation
    IF NOT (registration_result ->> 'success')::boolean THEN
      -- Create a regular profile as fallback
      INSERT INTO public.profiles (user_id, first_name, last_name, email)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name',
        NEW.email
      );
      
      -- Create initial balance for regular user
      INSERT INTO public.user_balances (user_id, balance)
      VALUES (NEW.id, 0.00);
    END IF;
  ELSE
    -- Regular user registration
    INSERT INTO public.profiles (user_id, first_name, last_name, email)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.email
    );
    
    -- Create initial balance for new user
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (NEW.id, 0.00);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the register_admin_with_invite function to automatically assign invite codes
CREATE OR REPLACE FUNCTION public.register_admin_with_invite(p_email text, p_user_id uuid, p_full_name text, p_admin_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invite_code RECORD;
  v_result jsonb;
  v_generated_codes text[];
  v_code_count integer := 5; -- Generate 5 invite codes for new admins
  v_new_code text;
  i integer;
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

  -- Generate invite codes for the new admin
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
      p_user_id,
      10, -- Each code can be used 10 times
      now() + interval '1 year' -- Codes expire in 1 year
    );
    
    v_generated_codes := array_append(v_generated_codes, v_new_code);
  END LOOP;

  -- Create admin profile with assigned invite codes
  INSERT INTO public.admin_profiles (
    user_id,
    email,
    full_name,
    role,
    is_active,
    assigned_invite_codes
  ) VALUES (
    p_user_id,
    p_email,
    p_full_name,
    v_invite_code.role,
    true,
    v_generated_codes
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

  -- Return success with generated codes
  RETURN jsonb_build_object(
    'success', true, 
    'role', v_invite_code.role,
    'assigned_codes', v_generated_codes,
    'message', 'Admin profile created successfully with ' || v_code_count || ' invite codes'
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