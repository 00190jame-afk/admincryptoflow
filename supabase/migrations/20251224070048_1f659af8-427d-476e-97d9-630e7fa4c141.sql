-- Disable the OLD auto-lose-trades cron jobs that conflict with the new system
SELECT cron.unschedule('auto-lose-expired-trades');
SELECT cron.unschedule('auto-lose-trades'); 
SELECT cron.unschedule('auto-lose-trades-every-minute');