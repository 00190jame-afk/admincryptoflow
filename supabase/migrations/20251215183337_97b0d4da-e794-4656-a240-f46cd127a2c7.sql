-- Fix profiles table: Replace is_admin() policies with is_any_admin()
DROP POLICY IF EXISTS "admin_all_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "admin_all_profiles_update" ON public.profiles;

CREATE POLICY "admin_all_profiles_select" 
ON public.profiles 
FOR SELECT 
USING (is_any_admin());

CREATE POLICY "admin_all_profiles_update" 
ON public.profiles 
FOR UPDATE 
USING (is_any_admin())
WITH CHECK (is_any_admin());

-- Fix user_balances table: Replace is_admin() policy with is_any_admin()
DROP POLICY IF EXISTS "admin_all_user_balances" ON public.user_balances;

CREATE POLICY "admin_all_user_balances" 
ON public.user_balances 
FOR ALL 
USING (is_any_admin())
WITH CHECK (is_any_admin());

-- Fix contact_messages table: Replace is_admin() policy with is_any_admin()
DROP POLICY IF EXISTS "Admins can manage all contact messages" ON public.contact_messages;

CREATE POLICY "Admins can manage all contact messages" 
ON public.contact_messages 
FOR ALL 
USING (is_any_admin())
WITH CHECK (is_any_admin());

-- Add rate limiting for contact form submissions
CREATE OR REPLACE FUNCTION public.check_contact_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Check how many messages from this email in the last hour
  SELECT COUNT(*) INTO recent_count
  FROM public.contact_messages
  WHERE email = NEW.email
    AND created_at > now() - interval '1 hour';
  
  -- Allow max 5 messages per hour per email
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending another message.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rate limiting
DROP TRIGGER IF EXISTS contact_message_rate_limit ON public.contact_messages;
CREATE TRIGGER contact_message_rate_limit
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_contact_message_rate_limit();