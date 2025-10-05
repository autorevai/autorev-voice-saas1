-- Add webhook_url and webhook_secret columns to assistants table
ALTER TABLE public.assistants
ADD COLUMN webhook_url TEXT,
ADD COLUMN webhook_secret TEXT;
