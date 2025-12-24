-- Clean up the orphaned position from the completed trade
DELETE FROM positions_orders WHERE trade_id = '73456066-b435-4159-a880-1488e9b24f04';

-- Also fix the incorrect profit amount on the trade (should be 50 * 0.30 = 15, not 1500)
UPDATE trades 
SET profit_loss_amount = stake_amount * (profit_rate / 100)
WHERE id = '73456066-b435-4159-a880-1488e9b24f04';