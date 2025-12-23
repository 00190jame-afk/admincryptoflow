-- Add decision-related columns to trades table
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS decision text,
ADD COLUMN IF NOT EXISTS previous_status text,
ADD COLUMN IF NOT EXISTS execute_at timestamp with time zone;

-- Add index for efficient querying of trades ready to execute
CREATE INDEX IF NOT EXISTS idx_trades_execute_at ON public.trades(execute_at) 
WHERE execute_at IS NOT NULL AND status = 'pending';

-- Add index for decision-based queries
CREATE INDEX IF NOT EXISTS idx_trades_decision ON public.trades(decision) 
WHERE decision IS NOT NULL;

-- Create function to set execute_at when decision is made
CREATE OR REPLACE FUNCTION public.set_trade_execute_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When decision is set and execute_at is null, set it to 3-5 minutes from now
  IF NEW.decision IS NOT NULL AND NEW.execute_at IS NULL THEN
    NEW.execute_at := now() + (180 + floor(random() * 120))::integer * interval '1 second';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-set execute_at when decision is made
DROP TRIGGER IF EXISTS trg_set_execute_at ON public.trades;
CREATE TRIGGER trg_set_execute_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  WHEN (NEW.decision IS DISTINCT FROM OLD.decision)
  EXECUTE FUNCTION public.set_trade_execute_at();

-- Create function to execute trades when execute_at is reached
CREATE OR REPLACE FUNCTION public.execute_pending_trades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade RECORD;
  v_result text;
  v_profit_amount numeric;
BEGIN
  -- Find all trades ready to execute
  FOR v_trade IN 
    SELECT * FROM public.trades 
    WHERE execute_at IS NOT NULL 
      AND execute_at <= now() 
      AND status = 'pending'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Determine result based on decision (default to loss if no decision)
    v_result := COALESCE(v_trade.decision, 'lose');
    
    -- Calculate profit/loss amount
    IF v_result = 'win' THEN
      v_profit_amount := v_trade.stake_amount * v_trade.profit_rate;
    ELSE
      v_profit_amount := -v_trade.stake_amount;
    END IF;
    
    -- Update the trade
    UPDATE public.trades
    SET 
      status = v_result,
      result = v_result,
      profit_loss_amount = v_profit_amount,
      completed_at = now(),
      status_indicator = '⚪️ COMPLETED'
    WHERE id = v_trade.id;
    
    -- Update user balance for win (stake was already deducted on trade creation)
    IF v_result = 'win' THEN
      -- Return stake + profit
      PERFORM public.update_user_balance(
        v_trade.user_id, 
        v_trade.stake_amount + v_profit_amount, 
        'system_trade', 
        'Trade win payout',
        v_trade.id
      );
    END IF;
    -- For loss, stake was already deducted, so no balance update needed
    
  END LOOP;
END;
$$;