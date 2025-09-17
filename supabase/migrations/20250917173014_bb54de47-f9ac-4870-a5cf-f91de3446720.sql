-- Remove duplicate triggers causing multiple executions of process_withdrawal
DROP TRIGGER IF EXISTS trg_process_withdrawal ON public.withdraw_requests;
DROP TRIGGER IF EXISTS trg_withdraw_requests_process ON public.withdraw_requests;

-- Keep a single, clearly named trigger in place; recreate if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE NOT tgisinternal
      AND tgrelid = 'public.withdraw_requests'::regclass
      AND tgname = 'process_withdrawal_trigger'
  ) THEN
    CREATE TRIGGER process_withdrawal_trigger
    BEFORE UPDATE ON public.withdraw_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.process_withdrawal();
  END IF;
END $$;