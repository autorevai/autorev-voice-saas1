-- Add call_count tracking to usage_tracking table for dual trial limits
-- This enables "10 calls OR 25 minutes" trial limit

-- Add call_count column
ALTER TABLE public.usage_tracking
ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS usage_tracking_call_count_idx
ON public.usage_tracking (tenant_id, call_count);

-- Add comment
COMMENT ON COLUMN public.usage_tracking.call_count IS 'Number of calls made in this billing period. Used for trial limit of 10 calls.';
