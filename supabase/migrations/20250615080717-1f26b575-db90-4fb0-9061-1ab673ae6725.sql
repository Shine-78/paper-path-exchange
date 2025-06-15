
-- Add missing columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS action_url text;
