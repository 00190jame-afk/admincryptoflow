-- Fix the closing order with incorrect realized_pnl (1500 should be 15)
UPDATE public.closing_orders
SET realized_pnl = 15
WHERE id = '4928dcf8-402f-4b85-abbc-7d6e9707ec1a';

-- Find and fix the corresponding trade's profit_loss_amount
UPDATE public.trades
SET profit_loss_amount = 15
WHERE id = (
  SELECT original_trade_id 
  FROM closing_orders 
  WHERE id = '4928dcf8-402f-4b85-abbc-7d6e9707ec1a'
);

-- Correct the user's balance (overpaid 1500-15 = 1485)
UPDATE public.user_balances
SET balance = balance - 1485,
    updated_at = now()
WHERE user_id = (
  SELECT user_id 
  FROM closing_orders 
  WHERE id = '4928dcf8-402f-4b85-abbc-7d6e9707ec1a'
);

-- Log the correction
INSERT INTO public.transactions (
  user_id, amount, type, description, status, currency
)
SELECT 
  user_id, 1485, 'withdrawal', 'Correction: trade profit was 1500, should be 15', 'completed', 'USDT'
FROM public.closing_orders
WHERE id = '4928dcf8-402f-4b85-abbc-7d6e9707ec1a';