-- Add customer information columns to calls table
-- This allows us to display customer data without parsing raw_json or joining bookings

ALTER TABLE calls
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Create index for faster customer lookups
CREATE INDEX IF NOT EXISTS idx_calls_customer_phone ON calls(customer_phone);

-- Backfill existing calls with customer data from raw_json
UPDATE calls
SET
  customer_name = raw_json->'customer'->>'name',
  customer_phone = raw_json->'customer'->>'phone'
WHERE raw_json IS NOT NULL
  AND raw_json->'customer' IS NOT NULL;
