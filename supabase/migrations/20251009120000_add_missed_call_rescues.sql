-- Create missed_call_rescues table for Smart Call Recovery automation
-- Tracks SMS and callback attempts to recover missed/abandoned calls

CREATE TABLE IF NOT EXISTS public.missed_call_rescues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  original_call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  customer_phone VARCHAR(20) NOT NULL,

  -- Recovery actions
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  callback_made BOOLEAN NOT NULL DEFAULT false,
  callback_vapi_call_id VARCHAR(255), -- VAPI call ID for scheduled callback

  -- Outcome tracking
  outcome VARCHAR(50), -- 'booked', 'no_answer', 'voicemail', 'declined', null (pending)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_missed_call_rescues_tenant_id
  ON public.missed_call_rescues(tenant_id);

CREATE INDEX IF NOT EXISTS idx_missed_call_rescues_created_at
  ON public.missed_call_rescues(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_missed_call_rescues_outcome
  ON public.missed_call_rescues(tenant_id, outcome);

CREATE INDEX IF NOT EXISTS idx_missed_call_rescues_callback_call_id
  ON public.missed_call_rescues(callback_vapi_call_id)
  WHERE callback_vapi_call_id IS NOT NULL;

-- RLS policies
ALTER TABLE public.missed_call_rescues ENABLE ROW LEVEL SECURITY;

CREATE POLICY missed_call_rescues_policy
  ON public.missed_call_rescues
  FOR ALL
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- Updated_at trigger
CREATE TRIGGER set_public_missed_call_rescues_updated_at
  BEFORE UPDATE ON public.missed_call_rescues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
