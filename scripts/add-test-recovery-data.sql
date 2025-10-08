-- Add test Smart Call Recovery data for tenant ba2ddf0a-d470-45ae-bf5a-fdf014b80a51
-- This will showcase the automation UI features

-- First, let's insert some test missed call rescues
-- You'll need to replace the call IDs with actual call IDs from your calls table

-- Example 1: Successful rescue that led to a booking (URGENT)
INSERT INTO missed_call_rescues (
  tenant_id,
  original_call_id,
  customer_phone,
  sms_sent,
  callback_made,
  outcome,
  created_at
) VALUES (
  'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51',
  (SELECT id FROM calls WHERE tenant_id = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' AND outcome = 'abandoned' LIMIT 1),
  '+15551234567',
  true,
  true,
  'booked',
  NOW() - INTERVAL '2 hours'
);

-- Example 2: SMS sent but no callback yet (RECENT)
INSERT INTO missed_call_rescues (
  tenant_id,
  original_call_id,
  customer_phone,
  sms_sent,
  callback_made,
  outcome,
  created_at
) VALUES (
  'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51',
  (SELECT id FROM calls WHERE tenant_id = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' LIMIT 1 OFFSET 1),
  '+15559876543',
  true,
  false,
  NULL,
  NOW() - INTERVAL '15 minutes'
);

-- Example 3: Another successful rescue (from yesterday)
INSERT INTO missed_call_rescues (
  tenant_id,
  original_call_id,
  customer_phone,
  sms_sent,
  callback_made,
  outcome,
  created_at
) VALUES (
  'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51',
  (SELECT id FROM calls WHERE tenant_id = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' LIMIT 1 OFFSET 2),
  '+15555551234',
  true,
  false,
  'booked',
  NOW() - INTERVAL '1 day'
);

-- Example 4: SMS sent recently (30 min ago)
INSERT INTO missed_call_rescues (
  tenant_id,
  original_call_id,
  customer_phone,
  sms_sent,
  callback_made,
  outcome,
  created_at
) VALUES (
  'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51',
  (SELECT id FROM calls WHERE tenant_id = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' LIMIT 1 OFFSET 3),
  '+15554443333',
  true,
  false,
  NULL,
  NOW() - INTERVAL '30 minutes'
);

-- Example 5: Failed SMS delivery
INSERT INTO missed_call_rescues (
  tenant_id,
  original_call_id,
  customer_phone,
  sms_sent,
  callback_made,
  outcome,
  created_at
) VALUES (
  'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51',
  (SELECT id FROM calls WHERE tenant_id = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' LIMIT 1 OFFSET 4),
  '+15552223333',
  false,
  false,
  NULL,
  NOW() - INTERVAL '3 hours'
);

-- Verify the data was inserted
SELECT
  mcr.id,
  mcr.customer_phone,
  mcr.sms_sent,
  mcr.outcome,
  mcr.created_at,
  c.customer_name,
  c.outcome as call_outcome
FROM missed_call_rescues mcr
JOIN calls c ON c.id = mcr.original_call_id
WHERE mcr.tenant_id = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51'
ORDER BY mcr.created_at DESC;
