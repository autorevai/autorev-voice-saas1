// ADD THIS TO: app/api/vapi/webhook/route.ts
// After the call ends and you've saved the call record

// This code should be added in the 'end-of-call-report' handler
// Right after you insert the call record into the database

// Example integration:
/*
case 'end-of-call-report': {
  const call = message.call
  const duration = call.duration // in seconds
  
  // ... existing code to save call record ...
  
  // NEW: Track usage for billing
  if (duration && tenantId) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/usage/current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenantId,
          durationSeconds: duration
        })
      })
      
      log.info('Usage tracked', { tenantId, duration })
    } catch (error) {
      log.error('Failed to track usage', { error, tenantId, duration })
      // Don't fail the webhook if usage tracking fails
    }
  }
  
  break
}
*/

// ============================================
// COMPLETE EXAMPLE OF UPDATED WEBHOOK HANDLER
// ============================================

// Add this helper function at the top of your webhook file:
export async function trackCallUsage(tenantId: string, durationSeconds: number, log: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/usage/current`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId,
        durationSeconds
      })
    })

    if (!response.ok) {
      throw new Error(`Usage API returned ${response.status}`)
    }

    const data = await response.json()
    
    log.info('✅ Usage tracked', { 
      tenantId, 
      durationSeconds,
      minutesUsed: data.minutesUsed,
      overageMinutes: data.overageMinutes
    })

    // If threshold reached, log warning
    if (data.thresholdReached) {
      log.warn('⚠️ Usage threshold reached', {
        tenantId,
        minutesUsed: data.minutesUsed
      })
    }

    return data
  } catch (error) {
    log.error('❌ Failed to track usage', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      tenantId, 
      durationSeconds 
    })
    // Don't throw - we don't want to fail the webhook if usage tracking fails
    return null
  }
}

// Then in your webhook handler, add this after saving the call:
/*
// Inside your 'end-of-call-report' case:
if (messageType === 'end-of-call-report') {
  const call = message.call
  
  // ... your existing code to save call record ...
  
  // NEW: Track usage
  const duration = call.duration || call.endedAt - call.startedAt
  if (duration && tenantId) {
    await trackCallUsage(tenantId, duration, log)
  }
}
*/

// ============================================
// ALTERNATIVE: Inline version (simpler)
// ============================================

// If you prefer not to create a helper function, use this inline:
/*
if (messageType === 'end-of-call-report') {
  const call = message.call
  const duration = call.duration || (call.endedAt - call.startedAt)
  
  // ... existing code to save call ...
  
  // Track usage
  if (duration && tenantId) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/usage/current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, durationSeconds: duration })
    }).catch(err => {
      log.error('Failed to track usage', { error: err.message })
    })
  }
}
*/

// ============================================
// WHAT THIS DOES:
// ============================================
// 1. When a call ends, extracts the duration in seconds
// 2. Calls the usage API to update the tenant's minute usage
// 3. Automatically calculates overage if they exceed plan limits
// 4. Logs warnings if they hit 80%, 90%, or 100% of their minutes
// 5. Doesn't fail the webhook if usage tracking fails (graceful degradation)

// ============================================
// TESTING:
// ============================================
// 1. Make a test call to your VAPI number
// 2. Let it run for 30+ seconds
// 3. Hang up
// 4. Check logs for "Usage tracked" message
// 5. Visit /dashboard to see the usage widget update
// 6. Check database: SELECT * FROM usage_tracking;
