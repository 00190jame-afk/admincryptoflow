-- Ensure full row replica identity for realtime diffs
ALTER TABLE public.withdraw_requests REPLICA IDENTITY FULL;
ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER TABLE public.contact_messages REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Broaden SELECT access for admin_profiles-based admins so realtime works
-- Withdraw requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'withdraw_requests' AND policyname = 'Admin profiles can view all withdrawal requests'
  ) THEN
    CREATE POLICY "Admin profiles can view all withdrawal requests"
    ON public.withdraw_requests
    FOR SELECT
    USING (is_any_admin());
  END IF;
END $$;

-- Trades
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trades' AND policyname = 'Admin profiles can view all trades'
  ) THEN
    CREATE POLICY "Admin profiles can view all trades"
    ON public.trades
    FOR SELECT
    USING (is_any_admin());
  END IF;
END $$;

-- Contact messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'Admin profiles can view all contact messages'
  ) THEN
    CREATE POLICY "Admin profiles can view all contact messages"
    ON public.contact_messages
    FOR SELECT
    USING (is_any_admin());
  END IF;
END $$;

-- Messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Admin profiles can view all messages'
  ) THEN
    CREATE POLICY "Admin profiles can view all messages"
    ON public.messages
    FOR SELECT
    USING (is_any_admin());
  END IF;
END $$;