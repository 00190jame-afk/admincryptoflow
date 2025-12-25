-- Fix the stuck WIN trade: ed14a5fd-1e04-45a7-b9bb-b8a13f3fc9de
-- This trade was set to 'win' but never properly finalized

DO $$
DECLARE
  v_trade RECORD;
  v_profit_amount numeric;
  v_total_payout numeric;
  v_position RECORD;
BEGIN
  -- Get the stuck trade
  SELECT * INTO v_trade
  FROM public.trades
  WHERE id = 'ed14a5fd-1e04-45a7-b9bb-b8a13f3fc9de';

  IF v_trade IS NULL THEN
    RAISE NOTICE 'Trade not found, skipping';
    RETURN;
  END IF;

  -- Only fix if status is 'win' but completed_at is null (stuck state)
  IF v_trade.status = 'win' AND v_trade.completed_at IS NULL THEN
    RAISE NOTICE 'Fixing stuck WIN trade: %', v_trade.id;

    -- Calculate profit
    v_profit_amount := v_trade.stake_amount * COALESCE(v_trade.profit_rate, 0.85);
    v_total_payout := v_trade.stake_amount + v_profit_amount;

    -- Create closing orders from any remaining positions
    FOR v_position IN 
      SELECT * FROM public.positions_orders WHERE trade_id = v_trade.id
    LOOP
      INSERT INTO public.closing_orders (
        user_id, symbol, side, leverage, entry_price, exit_price,
        quantity, realized_pnl, original_trade_id, stake, scale
      ) VALUES (
        v_position.user_id,
        v_position.symbol,
        v_position.side,
        v_position.leverage,
        v_position.entry_price,
        COALESCE(v_trade.current_price, v_position.mark_price, v_position.entry_price),
        v_position.quantity,
        ROUND(v_profit_amount, 2),
        v_trade.id,
        v_position.stake,
        v_position.scale
      );
    END LOOP;

    -- Delete positions
    DELETE FROM public.positions_orders WHERE trade_id = v_trade.id;

    -- Pay user (stake was already deducted, return stake + profit)
    -- Check if payout transaction already exists to avoid duplicate
    IF NOT EXISTS (
      SELECT 1 FROM public.transactions 
      WHERE trade_id = v_trade.id 
        AND type = 'deposit' 
        AND payment_method = 'system_trade'
    ) THEN
      PERFORM public.update_user_balance(
        v_trade.user_id,
        v_total_payout,
        'system_trade',
        'Trade win payout (fix)',
        v_trade.id
      );
      RAISE NOTICE 'Paid user % amount %', v_trade.user_id, v_total_payout;
    ELSE
      RAISE NOTICE 'Payout already exists, skipping balance update';
    END IF;

    -- Mark trade as complete
    UPDATE public.trades
    SET 
      result = 'win',
      profit_loss_amount = v_profit_amount,
      completed_at = now(),
      status_indicator = '⚪️ COMPLETED'
    WHERE id = v_trade.id;

    RAISE NOTICE 'Trade finalized with profit: %', v_profit_amount;
  ELSE
    RAISE NOTICE 'Trade not in stuck state (status=%, completed_at=%)', v_trade.status, v_trade.completed_at;
  END IF;
END $$;