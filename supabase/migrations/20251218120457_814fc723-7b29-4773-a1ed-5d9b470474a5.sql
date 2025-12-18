-- Fix the stuck on_hold balance for user orangelay014785@gmail.com
-- Move $100 from on_hold back to available balance
UPDATE public.user_balances 
SET 
  balance = balance + 100,
  on_hold = on_hold - 100,
  updated_at = now()
WHERE user_id = '2f312f4c-7d79-436e-8ace-07ffbb3b53f3';