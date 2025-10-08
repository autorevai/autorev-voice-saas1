-- Add Stripe fields to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'pro'));

-- Create subscriptions table for detailed tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('starter', 'growth', 'pro')),
  price_id TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_policy ON public.subscriptions
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_idx ON public.subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON public.subscriptions (stripe_subscription_id);

-- Create usage_tracking table for overage billing
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  minutes_included INTEGER NOT NULL,
  minutes_used INTEGER DEFAULT 0,
  overage_minutes INTEGER DEFAULT 0,
  overage_amount_cents INTEGER DEFAULT 0,
  synced_to_stripe BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (tenant_id, period_start)
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_tracking_policy ON public.usage_tracking
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS usage_tracking_tenant_id_period_idx ON public.usage_tracking (tenant_id, period_start DESC);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_history_policy ON public.payment_history
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS payment_history_tenant_id_idx ON public.payment_history (tenant_id, created_at DESC);
