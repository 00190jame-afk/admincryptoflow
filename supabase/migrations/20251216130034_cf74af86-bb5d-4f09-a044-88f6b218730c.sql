-- Add created_by column to track which admin created the recharge code
ALTER TABLE public.recharge_codes 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Create index for faster queries
CREATE INDEX idx_recharge_codes_created_by ON public.recharge_codes(created_by);