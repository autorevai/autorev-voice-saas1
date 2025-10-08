-- ============================================================
-- Smart Call Recovery - Test Data for Visual Demo
-- Tenant: ba2ddf0a-d470-45ae-bf5a-fdf014b80a51
-- ============================================================
-- This creates 7 test recovery attempts to showcase all UI features:
-- ✅ 2 successful rescues (booked) - green "🎯 Rescued" badges
-- 💬 3 SMS sent (pending) - blue "💬 SMS Sent" badges
-- ❌ 2 failed attempts - no badge, but shows in activity
-- ============================================================

-- 1. 🎯 SUCCESSFUL RESCUE - John Mays called back and booked (2 hours ago)
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
  '106a79f7-9183-41a1-9a0c-eaf874807037', -- John Mays
  '+740793487',
  true,
  true,
  'booked',
  NOW() - INTERVAL '2 hours'
);

-- 2. 💬 RECENT SMS - Just sent to Test Customer (15 min ago, no response yet)
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
  '44b51fae-6c46-4ad8-8389-2b9f865981bb', -- Test Customer
  '+17407393487',
  true,
  false,
  NULL,
  NOW() - INTERVAL '15 minutes'
);

-- 3. 🎯 SUCCESSFUL RESCUE - Chris Smith rescued yesterday!
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
  'e7717ce9-23fd-4ab5-baf0-9d0926a7d70e', -- Chris Smith
  '+17401111234',
  true,
  true,
  'booked',
  NOW() - INTERVAL '1 day'
);

-- 4. 💬 SMS SENT - Unknown customer from short call (30 min ago)
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
  'ce879744-1b19-4b1a-9108-4d8ab99cc54a', -- Unknown, 0 sec call
  '+17407393487',
  true,
  false,
  NULL,
  NOW() - INTERVAL '30 minutes'
);

-- 5. ❌ FAILED SMS - Couldn't send to null phone (3 hours ago)
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
  '2ad68b3c-a796-479c-8591-d582941224f0', -- null customer
  '+15555550000', -- fake number
  false,
  false,
  NULL,
  NOW() - INTERVAL '3 hours'
);

-- 6. 💬 SMS SENT - Another unknown customer (1 hour ago)
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
  'bb12af58-c386-4977-87c3-76279ff5ecd5', -- unknown
  '+17407393487',
  true,
  false,
  NULL,
  NOW() - INTERVAL '1 hour'
);

-- 7. ❌ DECLINED - SMS sent but customer declined (5 hours ago)
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
  '850d9527-04d1-4425-a1cf-21ae2fafd9d8', -- unknown
  '+17407393487',
  true,
  false,
  'declined',
  NOW() - INTERVAL '5 hours'
);

-- ============================================================
-- VERIFY THE DATA
-- ============================================================
SELECT
  '✅ Test data created!' as status,
  COUNT(*) as total_rescues,
  SUM(CASE WHEN sms_sent THEN 1 ELSE 0 END) as sms_sent_count,
  SUM(CASE WHEN outcome = 'booked' THEN 1 ELSE 0 END) as successful_rescues,
  ROUND(100.0 * SUM(CASE WHEN outcome = 'booked' THEN 1 ELSE 0 END) / COUNT(*)) as success_rate_percent
FROM missed_call_rescues
WHERE tenant_id = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51';

-- Show detailed view with customer names
SELECT
  mcr.created_at,
  c.customer_name,
  mcr.customer_phone,
  mcr.sms_sent,
  mcr.outcome,
  CASE
    WHEN mcr.outcome = 'booked' THEN '🎯 Rescued'
    WHEN mcr.sms_sent THEN '💬 SMS Sent'
    ELSE '❌ Failed'
  END as ui_badge
FROM missed_call_rescues mcr
LEFT JOIN calls c ON c.id = mcr.original_call_id
WHERE mcr.tenant_id = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51'
ORDER BY mcr.created_at DESC;
