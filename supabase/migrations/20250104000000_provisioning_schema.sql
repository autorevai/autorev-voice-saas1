-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE public.industry AS ENUM ('hvac', 'plumbing', 'electrical', 'dental', 'legal', 'medical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_code AS ENUM ('starter', 'core', 'pro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.call_outcome AS ENUM ('in_progress', 'info_collected', 'qualified', 'transferred', 'booked', 'voicemail', 'abandoned', 'spam');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS industry public.industry,
ADD COLUMN IF NOT EXISTS service_area TEXT[],
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"weekdays":"8am-6pm","weekends":"closed","emergency":false}'::jsonb,
ADD COLUMN IF NOT EXISTS emergency_keywords TEXT[] DEFAULT ARRAY['emergency','urgent'],
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS routing_config JSONB DEFAULT '{"sales":null,"dispatch":null,"billing":null}'::jsonb;

-- Create tenant_plans table
CREATE TABLE IF NOT EXISTS public.tenant_plans (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_code public.plan_code NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (tenant_id, plan_code)
);

ALTER TABLE public.tenant_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_plans_policy ON public.tenant_plans
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- Create plan_periods table
CREATE TABLE IF NOT EXISTS public.plan_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  minutes_included INTEGER NOT NULL,
  minutes_used INTEGER DEFAULT 0 NOT NULL,
  overage_minutes INTEGER DEFAULT 0 NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.plan_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY plan_periods_policy ON public.plan_periods
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS plan_periods_tenant_id_status_idx ON public.plan_periods (tenant_id, status);

-- Create billing_usage table
CREATE TABLE IF NOT EXISTS public.billing_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  minutes INTEGER DEFAULT 0 NOT NULL,
  call_count INTEGER DEFAULT 0 NOT NULL,
  booked_count INTEGER DEFAULT 0 NOT NULL,
  transferred_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (tenant_id, period_date)
);

ALTER TABLE public.billing_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_usage_policy ON public.billing_usage
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS billing_usage_tenant_id_period_date_idx ON public.billing_usage (tenant_id, period_date DESC);

-- Create call_events table
CREATE TABLE IF NOT EXISTS public.call_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY call_events_policy ON public.call_events
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS call_events_call_id_at_idx ON public.call_events (call_id, at DESC);

-- Add columns to assistants table
ALTER TABLE public.assistants
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS voice_config JSONB DEFAULT '{"provider":"11labs","model":"eleven_turbo_v2_5"}'::jsonb,
ADD COLUMN IF NOT EXISTS tools_config JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS playbook_config JSONB;

-- Add triggers for updated_at columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_public_plan_periods_updated_at') THEN
    CREATE TRIGGER set_public_plan_periods_updated_at
    BEFORE UPDATE ON public.plan_periods
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_public_billing_usage_updated_at') THEN
    CREATE TRIGGER set_public_billing_usage_updated_at
    BEFORE UPDATE ON public.billing_usage
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
