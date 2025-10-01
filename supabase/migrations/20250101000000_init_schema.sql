-- AutoRev Multi-Tenant Schema Migration
-- This migration creates the complete database schema for AutoRev's multi-tenant voice AI platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'user', 'viewer');
CREATE TYPE assistant_status AS ENUM ('active', 'inactive', 'draft', 'archived');
CREATE TYPE call_outcome AS ENUM ('completed', 'failed', 'abandoned', 'no_answer', 'busy', 'booked', 'handoff', 'unknown');
CREATE TYPE booking_priority AS ENUM ('urgent', 'high', 'standard', 'low');
CREATE TYPE booking_source AS ENUM ('voice_call', 'web_form', 'api', 'manual', 'import');

-- =============================================
-- CORE TENANT MANAGEMENT TABLES
-- =============================================

-- Tenants table - top-level organization entity
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users table - global user accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User-Tenant relationship table with roles
CREATE TABLE user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- =============================================
-- VOICE AI ASSISTANT TABLES
-- =============================================

-- Assistants table - VAPI assistant configurations per tenant
CREATE TABLE assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vapi_assistant_id VARCHAR(255) NOT NULL,
    vapi_number_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    status assistant_status NOT NULL DEFAULT 'draft',
    settings_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CALL TRACKING TABLES
-- =============================================

-- Calls table - tracks all voice calls
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    vapi_call_id VARCHAR(255) NOT NULL UNIQUE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_sec INTEGER,
    cost_cents INTEGER DEFAULT 0,
    outcome call_outcome,
    transcript_url TEXT,
    raw_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_duration CHECK (duration_sec IS NULL OR duration_sec >= 0),
    CONSTRAINT valid_cost CHECK (cost_cents >= 0),
    CONSTRAINT valid_times CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Tool results table - tracks tool calls and responses
CREATE TABLE tool_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    request_json JSONB NOT NULL DEFAULT '{}',
    response_json JSONB NOT NULL DEFAULT '{}',
    success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- BOOKING MANAGEMENT TABLES
-- =============================================

-- Bookings table - service appointments created via voice calls
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    confirmation VARCHAR(50) NOT NULL UNIQUE,
    window_text VARCHAR(100) NOT NULL,
    start_ts TIMESTAMPTZ NOT NULL,
    duration_min INTEGER NOT NULL DEFAULT 90,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    summary TEXT,
    equipment VARCHAR(255),
    priority booking_priority NOT NULL DEFAULT 'standard',
    source booking_source NOT NULL DEFAULT 'voice_call',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_duration_min CHECK (duration_min > 0),
    CONSTRAINT valid_phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$')
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Tenant-based indexes for RLS performance
CREATE INDEX idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX idx_assistants_tenant_id ON assistants(tenant_id);
CREATE INDEX idx_calls_tenant_id ON calls(tenant_id);
CREATE INDEX idx_tool_results_call_id ON tool_results(call_id);
CREATE INDEX idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX idx_bookings_call_id ON bookings(call_id);

-- Time-based indexes for common queries
CREATE INDEX idx_calls_started_at ON calls(started_at);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_bookings_start_ts ON bookings(start_ts);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_tool_results_created_at ON tool_results(created_at);

-- Lookup indexes
CREATE INDEX idx_calls_vapi_call_id ON calls(vapi_call_id);
CREATE INDEX idx_assistants_vapi_assistant_id ON assistants(vapi_assistant_id);
CREATE INDEX idx_bookings_confirmation ON bookings(confirmation);
CREATE INDEX idx_bookings_phone ON bookings(phone);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper function to get user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids(user_uuid UUID)
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT ut.tenant_id
    FROM user_tenants ut
    WHERE ut.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view tenants they belong to" ON tenants
    FOR SELECT USING (id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Users can update tenants they belong to" ON tenants
    FOR UPDATE USING (id IN (SELECT get_user_tenant_ids(auth.uid())));

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- User-tenants policies
CREATE POLICY "Users can view their tenant relationships" ON user_tenants
    FOR SELECT USING (user_id = auth.uid() OR tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Users can view tenant members" ON user_tenants
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- Assistants policies
CREATE POLICY "Users can view assistants in their tenants" ON assistants
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Users can manage assistants in their tenants" ON assistants
    FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- Calls policies
CREATE POLICY "Users can view calls in their tenants" ON calls
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Users can manage calls in their tenants" ON calls
    FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- Tool results policies
CREATE POLICY "Users can view tool results for their tenant calls" ON tool_results
    FOR SELECT USING (
        call_id IN (
            SELECT c.id FROM calls c 
            WHERE c.tenant_id IN (SELECT get_user_tenant_ids(auth.uid()))
        )
    );

CREATE POLICY "Users can manage tool results for their tenant calls" ON tool_results
    FOR ALL USING (
        call_id IN (
            SELECT c.id FROM calls c 
            WHERE c.tenant_id IN (SELECT get_user_tenant_ids(auth.uid()))
        )
    );

-- Bookings policies
CREATE POLICY "Users can view bookings in their tenants" ON bookings
    FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Users can manage bookings in their tenants" ON bookings
    FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tenants_updated_at BEFORE UPDATE ON user_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate booking confirmation code
CREATE OR REPLACE FUNCTION generate_booking_confirmation()
RETURNS TEXT AS $$
DECLARE
    confirmation TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        confirmation := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if it already exists
        SELECT COUNT(*) INTO exists_count
        FROM bookings
        WHERE confirmation = generate_booking_confirmation.confirmation;
        
        -- If unique, return it
        IF exists_count = 0 THEN
            RETURN confirmation;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA (Optional - for development)
-- =============================================

-- Insert sample tenant
INSERT INTO tenants (id, name, slug) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'AutoRev Demo', 'autorev-demo');

-- Insert sample user
INSERT INTO users (id, email, name) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@autorev.ai', 'AutoRev Admin');

-- Link user to tenant
INSERT INTO user_tenants (user_id, tenant_id, role) VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner');

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE tenants IS 'Top-level organization entities in the multi-tenant system';
COMMENT ON TABLE users IS 'Global user accounts that can belong to multiple tenants';
COMMENT ON TABLE user_tenants IS 'Many-to-many relationship between users and tenants with roles';
COMMENT ON TABLE assistants IS 'VAPI assistant configurations per tenant';
COMMENT ON TABLE calls IS 'Voice call records with VAPI integration data';
COMMENT ON TABLE tool_results IS 'Tool call results and responses from voice interactions';
COMMENT ON TABLE bookings IS 'Service appointments created through voice calls';

COMMENT ON COLUMN user_tenants.role IS 'User role within the tenant: owner, admin, user, or viewer';
COMMENT ON COLUMN assistants.status IS 'Assistant status: active, inactive, draft, or archived';
COMMENT ON COLUMN calls.outcome IS 'Call outcome: completed, failed, abandoned, no_answer, or busy';
COMMENT ON COLUMN bookings.priority IS 'Booking priority: urgent, high, standard, or low';
COMMENT ON COLUMN bookings.source IS 'How the booking was created: voice_call, web_form, api, manual, or import';
