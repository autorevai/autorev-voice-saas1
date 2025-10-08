-- Add trial usage tracking columns to tenants table
-- These track cumulative usage for trial users (10 calls OR 25 minutes limit)

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS trial_calls_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_minutes_used INTEGER DEFAULT 0;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS tenants_trial_usage_idx
ON public.tenants (id, trial_calls_used, trial_minutes_used);

-- Add comments
COMMENT ON COLUMN public.tenants.trial_calls_used IS 'Total number of calls made during trial period. Trial limit: 10 calls.';
COMMENT ON COLUMN public.tenants.trial_minutes_used IS 'Total minutes used during trial period (rounded up). Trial limit: 25 minutes.';
