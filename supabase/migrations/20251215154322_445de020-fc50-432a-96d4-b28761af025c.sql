-- Drop the audit_logs table
DROP TABLE IF EXISTS public.audit_logs;

-- Drop the log_admin_action function
DROP FUNCTION IF EXISTS public.log_admin_action(text, text, uuid, text, jsonb, jsonb);

-- Recreate admin_update_user_balance without audit_logs INSERT
CREATE OR REPLACE FUNCTION public.admin_update_user_balance(p_user_id uuid, p_balance numeric DEFAULT NULL::numeric, p_frozen numeric DEFAULT NULL::numeric, p_on_hold numeric DEFAULT NULL::numeric, p_description text DEFAULT 'Admin balance update'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance RECORD;
  v_old_values jsonb;
  v_new_values jsonb;
  v_balance_change numeric;
BEGIN
  -- Ensure caller is an admin
  IF NOT is_any_admin() THEN
    RAISE EXCEPTION 'Not authorized - admin access required';
  END IF;

  -- Get current balance
  SELECT balance, frozen, on_hold INTO v_current_balance
  FROM public.user_balances
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Create balance record if it doesn't exist
    INSERT INTO public.user_balances (user_id, balance, frozen, on_hold, currency)
    VALUES (p_user_id, COALESCE(p_balance, 0), COALESCE(p_frozen, 0), COALESCE(p_on_hold, 0), 'USDT');
    
    -- Log the creation with the total amount
    INSERT INTO public.transactions (
      user_id,
      type,
      amount,
      status,
      currency,
      payment_method,
      description
    ) VALUES (
      p_user_id,
      'admin_update',
      COALESCE(p_balance, 0) + COALESCE(p_frozen, 0) + COALESCE(p_on_hold, 0),
      'completed',
      'USDT',
      'admin_management',
      p_description
    );
    RETURN;
  END IF;

  -- Store old values
  v_old_values := jsonb_build_object(
    'balance', v_current_balance.balance,
    'frozen', v_current_balance.frozen,
    'on_hold', v_current_balance.on_hold
  );

  -- Update fields that are provided (non-null)
  UPDATE public.user_balances
  SET 
    balance = COALESCE(p_balance, balance),
    frozen = COALESCE(p_frozen, frozen),
    on_hold = COALESCE(p_on_hold, on_hold),
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Get new values
  SELECT balance, frozen, on_hold INTO v_current_balance
  FROM public.user_balances
  WHERE user_id = p_user_id;

  v_new_values := jsonb_build_object(
    'balance', v_current_balance.balance,
    'frozen', v_current_balance.frozen,
    'on_hold', v_current_balance.on_hold
  );

  -- Calculate the total balance change for transaction record
  v_balance_change := (v_new_values->>'balance')::numeric + (v_new_values->>'frozen')::numeric + (v_new_values->>'on_hold')::numeric - 
                     (v_old_values->>'balance')::numeric - (v_old_values->>'frozen')::numeric - (v_old_values->>'on_hold')::numeric;

  -- Insert transaction record for audit trail (only if there's an actual change)
  IF ABS(v_balance_change) > 0 THEN
    INSERT INTO public.transactions (
      user_id,
      type,
      amount,
      status,
      currency,
      payment_method,
      description
    ) VALUES (
      p_user_id,
      'admin_update',
      ABS(v_balance_change),
      'completed',
      'USDT',
      'admin_management',
      p_description
    );
  END IF;
END;
$function$;