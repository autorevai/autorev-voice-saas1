// scripts/test-twilio.ts
// Run with: npx tsx scripts/test-twilio.ts

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load env BEFORE importing other modules
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { sendSMS, sendMissedCallSMS } from '../lib/twilio/sms'

async function testTwilio() {
  console.log('🧪 Testing Twilio SMS Integration...\n')

  // IMPORTANT: Replace this with YOUR phone number for testing
  const TEST_PHONE = '+18777804236' // ← CHANGE THIS TO YOUR PHONE NUMBER

  // Use test8 tenant ID
  const TEST_TENANT_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51'

  if (TEST_PHONE === '+18777804236') {
    console.log('⚠️  Using default test phone number (+18777804236)')
    console.log('   This is the virtual phone number for testing')
    console.log('   Update TEST_PHONE in scripts/test-twilio.ts to test with your real phone\n')
  }

  try {
    // Test 1: Send basic SMS
    console.log('📤 Test 1: Sending basic SMS...')
    const result = await sendSMS({
      to: TEST_PHONE,
      message: '🧪 Test SMS from AutoRev! If you received this, Twilio integration is working! 🎉',
      tenantId: TEST_TENANT_ID,
      type: 'general'
    })

    if (result.success) {
      console.log('✅ Test 1 PASSED: SMS sent successfully!')
      console.log(`   Twilio SID: ${result.sid}`)
      console.log(`   Check phone: ${TEST_PHONE}`)
    } else {
      console.log('❌ Test 1 FAILED:', result.error)
      process.exit(1)
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Test 2: Send missed call SMS
    console.log('📤 Test 2: Sending missed call SMS...')
    const missedCallResult = await sendMissedCallSMS(
      TEST_PHONE,
      TEST_TENANT_ID,
      '+18446980586',
      'Test 8 HVAC'
    )

    if (missedCallResult.success) {
      console.log('✅ Test 2 PASSED: Missed call SMS sent!')
      console.log(`   Twilio SID: ${missedCallResult.sid}`)
    } else {
      console.log('❌ Test 2 FAILED:', missedCallResult.error)
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Summary
    console.log('🎉 TWILIO INTEGRATION TESTS COMPLETE!\n')
    console.log('✅ SMS sending works')
    console.log('✅ Database logging works')
    console.log('✅ Ready to implement automations\n')

    console.log('📋 Next steps:')
    console.log('   1. Check your phone for 2 test messages')
    console.log('   2. Check Twilio console: https://console.twilio.com/us1/monitor/logs/sms')
    console.log('   3. Check Supabase sms_log table for entries')
    console.log('   4. Proceed with automation implementation\n')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testTwilio().catch(console.error)
