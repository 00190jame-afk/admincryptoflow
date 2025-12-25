-- Fix the incorrect profit calculation
-- Correct profit: 50 * 0.30 = 15 (not 50 * 30 = 1500)
-- Overpaid: 1550 - 65 = 1485

-- Correct the trade's profit_loss_amount
UPDATE public.trades
SET profit_loss_amount = 15
WHERE id = 'ed14a5fd-1e04-45a7-b9bb-b8a13f3fc9de';

-- Correct the user's balance (deduct the overpayment)
UPDATE public.user_balances
SET balance = balance - 1485,
    updated_at = now()
WHERE user_id = 'ba176509-71b7-40d7-a919-c5972334599d';

-- Log the correction transaction
INSERT INTO public.transactions (
  user_id, email, amount, type, description, status, currency, payment_method
)
SELECT 
  user_id, email, 1485, 'withdrawal', 'Correction: overpaid trade profit (was 1500, should be 15)', 'completed', 'USDT', 'system_correction'
FROM public.user_balances
WHERE user_id = 'ba176509-71b7-40d7-a919-c5972334599d';