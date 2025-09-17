-- Enable realtime for withdraw_requests table
ALTER TABLE public.withdraw_requests REPLICA IDENTITY FULL;

-- Add withdraw_requests to realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdraw_requests;

-- Enable realtime for trades table
ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Enable realtime for contact_messages table
ALTER TABLE public.contact_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;

-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;