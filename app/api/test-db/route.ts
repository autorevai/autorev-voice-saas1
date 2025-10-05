// app/api/test-db/route.ts
// Database Connection and Operations Test Endpoint

import { createClient } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0
    }
  };

  // Helper function to add test results
  function addTest(name: string, passed: boolean, details: any, error?: any) {
    results.tests.push({
      name,
      passed,
      details,
      error: error?.message || null,
      timestamp: new Date().toISOString()
    });
    
    if (passed) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
    results.summary.total++;
  }

  try {
    console.log('[TEST_DB] Starting database connection tests...');

    // Test 1: Supabase Connection
    try {
      const supabase = createClient();
      addTest('Supabase Connection', true, { message: 'Client created successfully' });
    } catch (error: any) {
      addTest('Supabase Connection', false, { message: 'Failed to create client' }, error);
      return NextResponse.json(results, { status: 500 });
    }

    const supabase = createClient();

    // Test 2: Check Demo Tenant Exists
    try {
      const demoTenantId = process.env.DEMO_TENANT_ID;
      if (!demoTenantId) {
        addTest('Demo Tenant Check', false, { message: 'DEMO_TENANT_ID not set in environment' });
        return NextResponse.json(results, { status: 500 });
      }

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug, setup_completed')
        .eq('id', demoTenantId)
        .single();

      if (tenantError) {
        addTest('Demo Tenant Check', false, { 
          message: 'Error querying tenant',
          error: tenantError.message,
          code: tenantError.code
        });
      } else if (!tenant) {
        addTest('Demo Tenant Check', false, { 
          message: 'Demo tenant not found',
          tenantId: demoTenantId
        });
      } else {
        addTest('Demo Tenant Check', true, { 
          message: 'Demo tenant found',
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            setup_completed: tenant.setup_completed
          }
        });
      }
    } catch (error: any) {
      addTest('Demo Tenant Check', false, { message: 'Unexpected error checking tenant' }, error);
    }

    // Test 3: Insert Test Call
    try {
      const testCallId = `test-call-${Date.now()}`;
      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({
          tenant_id: process.env.DEMO_TENANT_ID,
          vapi_call_id: testCallId,
          started_at: new Date().toISOString(),
          outcome: 'unknown',
          raw_json: { test: true, timestamp: new Date().toISOString() }
        })
        .select()
        .single();

      if (callError) {
        addTest('Test Call Insert', false, { 
          message: 'Failed to insert test call',
          error: callError.message,
          code: callError.code,
          details: callError.details
        });
      } else {
        addTest('Test Call Insert', true, { 
          message: 'Test call inserted successfully',
          callId: call.id,
          vapiCallId: testCallId
        });

        // Clean up test call
        try {
          await supabase.from('calls').delete().eq('id', call.id);
          console.log('[TEST_DB] Test call cleaned up');
        } catch (cleanupError) {
          console.warn('[TEST_DB] Failed to cleanup test call:', cleanupError);
        }
      }
    } catch (error: any) {
      addTest('Test Call Insert', false, { message: 'Unexpected error inserting call' }, error);
    }

    // Test 4: Insert Test Booking
    try {
      const testConfirmation = `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          tenant_id: process.env.DEMO_TENANT_ID,
          confirmation: testConfirmation,
          window_text: 'Test appointment',
          start_ts: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration_min: 60,
          name: 'Test Customer',
          phone: '+14075551234',
          email: 'test@example.com',
          address: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          summary: 'Test service',
          priority: 'standard',
          source: 'test'
        })
        .select()
        .single();

      if (bookingError) {
        addTest('Test Booking Insert', false, { 
          message: 'Failed to insert test booking',
          error: bookingError.message,
          code: bookingError.code,
          details: bookingError.details
        });
      } else {
        addTest('Test Booking Insert', true, { 
          message: 'Test booking inserted successfully',
          bookingId: booking.id,
          confirmation: testConfirmation
        });

        // Clean up test booking
        try {
          await supabase.from('bookings').delete().eq('id', booking.id);
          console.log('[TEST_DB] Test booking cleaned up');
        } catch (cleanupError) {
          console.warn('[TEST_DB] Failed to cleanup test booking:', cleanupError);
        }
      }
    } catch (error: any) {
      addTest('Test Booking Insert', false, { message: 'Unexpected error inserting booking' }, error);
    }

    // Test 5: Check Database Tables Exist
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['tenants', 'users', 'assistants', 'calls', 'bookings', 'tool_results']);

      if (tablesError) {
        addTest('Database Tables Check', false, { 
          message: 'Failed to check database tables',
          error: tablesError.message
        });
      } else {
        const tableNames = tables?.map(t => t.table_name) || [];
        const expectedTables = ['tenants', 'users', 'assistants', 'calls', 'bookings', 'tool_results'];
        const missingTables = expectedTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length > 0) {
          addTest('Database Tables Check', false, { 
            message: 'Missing required tables',
            missing: missingTables,
            found: tableNames
          });
        } else {
          addTest('Database Tables Check', true, { 
            message: 'All required tables exist',
            tables: tableNames
          });
        }
      }
    } catch (error: any) {
      addTest('Database Tables Check', false, { message: 'Unexpected error checking tables' }, error);
    }

    // Test 6: Check RLS Policies
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('tablename, policyname, permissive, roles, cmd, qual')
        .in('tablename', ['tenants', 'users', 'assistants', 'calls', 'bookings', 'tool_results']);

      if (policiesError) {
        addTest('RLS Policies Check', false, { 
          message: 'Failed to check RLS policies',
          error: policiesError.message
        });
      } else {
        const policyCount = policies?.length || 0;
        addTest('RLS Policies Check', true, { 
          message: `Found ${policyCount} RLS policies`,
          policies: policies?.map(p => ({ table: p.tablename, policy: p.policyname })) || []
        });
      }
    } catch (error: any) {
      addTest('RLS Policies Check', false, { message: 'Unexpected error checking RLS policies' }, error);
    }

    results.summary.duration = Date.now() - startTime;

    console.log('[TEST_DB] Database tests completed:', {
      total: results.summary.total,
      passed: results.summary.passed,
      failed: results.summary.failed,
      duration: results.summary.duration
    });

    return NextResponse.json(results, { 
      status: results.summary.failed > 0 ? 500 : 200 
    });

  } catch (error: any) {
    results.summary.duration = Date.now() - startTime;
    addTest('Overall Test', false, { message: 'Unexpected error in test suite' }, error);
    
    console.error('[TEST_DB] Test suite failed:', error);
    return NextResponse.json(results, { status: 500 });
  }
}
