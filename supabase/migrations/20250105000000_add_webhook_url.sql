-- Add webhook_url column to assistants table
ALTER TABLE assistants ADD COLUMN webhook_url TEXT;

-- Add index for webhook_url lookups
CREATE INDEX idx_assistants_webhook_url ON assistants(webhook_url);

-- Update existing assistants with webhook URL
UPDATE assistants 
SET webhook_url = 'http://localhost:3001/api/vapi/webhook'
WHERE webhook_url IS NULL;
