-- Add customer address fields to calls table
-- This allows us to store complete customer information collected during the call

ALTER TABLE calls
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS customer_state TEXT,
ADD COLUMN IF NOT EXISTS customer_zip TEXT;

-- Create indexes for faster customer lookups
CREATE INDEX IF NOT EXISTS idx_calls_customer_address ON calls(customer_address);
CREATE INDEX IF NOT EXISTS idx_calls_customer_city ON calls(customer_city);
CREATE INDEX IF NOT EXISTS idx_calls_customer_zip ON calls(customer_zip);

-- Backfill existing calls with customer data from raw_json
UPDATE calls
SET
  customer_address = raw_json->'customer'->>'address',
  customer_city = raw_json->'customer'->>'city',
  customer_state = raw_json->'customer'->>'state',
  customer_zip = raw_json->'customer'->>'zip'
WHERE raw_json IS NOT NULL
  AND raw_json->'customer' IS NOT NULL;
