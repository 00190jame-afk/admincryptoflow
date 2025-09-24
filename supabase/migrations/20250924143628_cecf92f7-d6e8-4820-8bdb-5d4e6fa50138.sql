-- Create admin version of balance management functions
-- These functions allow admins to manage user balances directly

-- Admin function to update user balance with direct field updates
CREATE OR REPLACE FUNCTION public.admin_update_user_balance(
  p_user_id uuid,
  p_balance numeric DEFAULT NULL,
  p_frozen numeric DEFAULT NULL,
  p_on_hold numeric DEFAULT NULL,
  p_description text DEFAULT 'Admin balance update'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_balance RECORD;
  v_old_values jsonb;
  v_new_values jsonb;
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
    
    -- Log the creation
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
      COALESCE(p_balance, 0),
      'completed',
      'USDT',
      'admin_management',
      p_description
    );
    RETURN;
  END IF;

  -- Store old values for audit
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

  -- Get new values for audit
  SELECT balance, frozen, on_hold INTO v_current_balance
  FROM public.user_balances
  WHERE user_id = p_user_id;

  v_new_values := jsonb_build_object(
    'balance', v_current_balance.balance,
    'frozen', v_current_balance.frozen,
    'on_hold', v_current_balance.on_hold
  );

  -- Log the admin action
  INSERT INTO public.audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    'balance_update',
    'user_balance',
    p_user_id,
    p_description,
    v_old_values,
    v_new_values
  );

  -- Insert transaction record for audit trail
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
    COALESCE(p_balance, v_current_balance.balance),
    'completed',
    'USDT',
    'admin_management',
    p_description
  );
END;
$$;