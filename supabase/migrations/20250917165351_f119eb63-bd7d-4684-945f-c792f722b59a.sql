-- Allow admins (from admin_profiles) to update withdraw requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'withdraw_requests' AND policyname = 'Admin profiles can update withdrawal requests'
  ) THEN
    CREATE POLICY "Admin profiles can update withdrawal requests"
    ON public.withdraw_requests
    FOR UPDATE
    USING (is_any_admin())
    WITH CHECK (is_any_admin());
  END IF;
END $$;

-- Create trigger to process approvals/rejections consistently
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_withdraw_requests_process'
  ) THEN
    CREATE TRIGGER trg_withdraw_requests_process
    BEFORE UPDATE ON public.withdraw_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.process_withdrawal();
  END IF;
END $$;