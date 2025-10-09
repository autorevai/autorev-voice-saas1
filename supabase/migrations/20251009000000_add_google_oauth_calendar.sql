-- Add Google OAuth and Calendar columns
-- Migration for Phase 1: Calendar Availability + SMS

-- Add Google OAuth columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;

-- Add Google Calendar columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS calendar_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calendar_timezone TEXT DEFAULT 'America/New_York';

-- Add calendar event tracking to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS preferred_date TEXT,
ADD COLUMN IF NOT EXISTS preferred_time TEXT,
ADD COLUMN IF NOT EXISTS service_type TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_event ON bookings(google_calendar_event_id);

-- Comments for documentation
COMMENT ON COLUMN users.google_id IS 'Google user ID for OAuth authentication';
COMMENT ON COLUMN users.google_access_token IS 'Google OAuth access token';
COMMENT ON COLUMN users.google_refresh_token IS 'Google OAuth refresh token for token renewal';
COMMENT ON COLUMN tenants.google_calendar_id IS 'Google Calendar ID (usually "primary")';
COMMENT ON COLUMN tenants.calendar_sync_enabled IS 'Whether calendar sync is active for this tenant';
COMMENT ON COLUMN bookings.google_calendar_event_id IS 'Google Calendar event ID for synced bookings';
