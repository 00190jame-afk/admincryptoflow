-- Add IP tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS user_agent text;