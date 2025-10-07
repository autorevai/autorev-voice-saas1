#!/usr/bin/env tsx
// scripts/seed-realistic-data.ts
// Seed the database with realistic test call and booking data

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('Required: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Sample customer data
const customers = [
  { name: 'John Smith', phone: '7402403270', address: '123 Main St', city: 'Columbus', state: 'OH', zip: '43201' },
  { name: 'Sarah Johnson', phone: '6145551234', address: '456 Oak Ave', city: 'Dublin', state: 'OH', zip: '43017' },
  { name: 'Michael Brown', phone: '6145555678', address: '789 Elm St', city: 'Worthington', state: 'OH', zip: '43085' },
  { name: 'Emily Davis', phone: '6145559012', address: '321 Pine Dr', city: 'Westerville', state: 'OH', zip: '43081' },
  { name: 'David Wilson', phone: '7405553456', address: '654 Maple Ln', city: 'Powell', state: 'OH', zip: '43065' },
  { name: 'Lisa Anderson', phone: '7405557890', address: '987 Cedar Ct', city: 'Hilliard', state: 'OH', zip: '43026' },
  { name: 'James Martinez', phone: '6145552345', address: '147 Birch Way', city: 'Grove City', state: 'OH', zip: '43123' },
  { name: 'Jennifer Taylor', phone: '6145556789', address: '258 Spruce Rd', city: 'Reynoldsburg', state: 'OH', zip: '43068' },
  { name: 'Robert Thomas', phone: '7405550123', address: '369 Willow St', city: 'Gahanna', state: 'OH', zip: '43230' },
  { name: 'Jessica White', phone: '7405554567', address: '741 Ash Blvd', city: 'New Albany', state: 'OH', zip: '43054' },
  { name: 'Christopher Lee', phone: '6145558901', address: '852 Hickory Ave', city: 'Upper Arlington', state: 'OH', zip: '43220' },
  { name: 'Amanda Harris', phone: '6145553210', address: '963 Poplar Pl', city: 'Bexley', state: 'OH', zip: '43209' },
  { name: 'Matthew Clark', phone: '7405551098', address: '159 Walnut Dr', city: 'Pickerington', state: 'OH', zip: '43147' },
  { name: 'Ashley Lewis', phone: '7405555432', address: '267 Cherry Ln', city: 'Canal Winchester', state: 'OH', zip: '43110' },
  { name: 'Daniel Robinson', phone: '6145557654', address: '378 Sycamore Way', city: 'Groveport', state: 'OH', zip: '43125' },
]

const outcomes = ['booked', 'booked', 'booked', 'booked', 'handoff', 'unknown', 'unknown']
const serviceTypes = ['AC Repair', 'Furnace Repair', 'Heat Pump Service', 'Thermostat Installation', 'Air Quality Check', 'Maintenance', 'Emergency Repair']

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomDuration(): number {
  return Math.floor(Math.random() * 300) + 60 // 60-360 seconds
}

function getRandomDate(daysAgo: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(Math.floor(Math.random() * 12) + 8) // 8am - 8pm
  date.setMinutes(Math.floor(Math.random() * 60))
  date.setSeconds(0)
  return date
}

async function seedTestData() {
  console.log('🌱 Seeding realistic test data...')
  console.log('')

  // Use specific tenant ID
  const tenantId = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' // Test 8 HVAC

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    console.error('❌ Tenant not found:', tenantId)
    process.exit(1)
  }

  const { data: assistants } = await supabase
    .from('assistants')
    .select('id')
    .eq('tenant_id', tenant.id)
    .limit(1)

  if (!assistants || assistants.length === 0) {
    console.error('❌ No assistant found for tenant')
    process.exit(1)
  }

  const assistant = assistants[0]

  console.log('✅ Tenant:', tenant.name, '(' + tenant.id + ')')
  console.log('✅ Assistant:', assistant.id)
  console.log('')

  let callsCreated = 0
  let bookingsCreated = 0

  // Create 15 test calls with varying dates
  for (let i = 0; i < 15; i++) {
    const customer = customers[i]
    const outcome = getRandomItem(outcomes)
    const serviceType = getRandomItem(serviceTypes)
    const daysAgo = Math.floor(i / 3) // Spread across ~5 days
    const startedAt = getRandomDate(daysAgo)
    const durationSec = getRandomDuration()
    const endedAt = new Date(startedAt.getTime() + durationSec * 1000)

    // Create call
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        tenant_id: tenant.id,
        assistant_id: assistant.id,
        vapi_call_id: `test_call_${Date.now()}_${i}`,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_sec: durationSec,
        outcome: outcome,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        customer_city: customer.city,
        customer_state: customer.state,
        customer_zip: customer.zip,
        raw_json: {
          customer: {
            name: customer.name,
            number: `+1${customer.phone}`
          },
          call: {
            id: `test_call_${Date.now()}_${i}`,
            type: 'inboundPhoneCall',
            status: 'ended',
            phoneNumber: {
              number: '+17402403270'
            }
          },
          transcript: `Customer called about ${serviceType.toLowerCase()}.`,
          messages: []
        }
      })
      .select()
      .single()

    if (callError) {
      console.error(`❌ Error creating call ${i}:`, callError)
      continue
    }

    callsCreated++
    console.log(`✅ Call ${i + 1}: ${customer.name} - ${outcome} (${Math.floor(daysAgo)} days ago)`)

    // Create booking if outcome is 'booked'
    if (outcome === 'booked' && call) {
      const preferredTime = new Date(startedAt)
      preferredTime.setDate(preferredTime.getDate() + Math.floor(Math.random() * 3) + 1) // 1-3 days from call
      preferredTime.setHours(Math.floor(Math.random() * 8) + 9) // 9am - 5pm

      const confirmation = `BK${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      const windowText = `${preferredTime.toLocaleDateString()} ${preferredTime.getHours()}:00-${preferredTime.getHours() + 2}:00`

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          tenant_id: tenant.id,
          call_id: call.id,
          confirmation: confirmation,
          window_text: windowText,
          start_ts: preferredTime.toISOString(),
          duration_min: 120,
          name: customer.name,
          phone: `+1${customer.phone}`,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zip: customer.zip,
          summary: `${serviceType} - VAPI_CALL_ID:${call.vapi_call_id}`,
          equipment: null,
          priority: 'standard',
          source: 'voice_call'
        })

      if (bookingError) {
        console.error(`❌ Error creating booking for call ${i}:`, bookingError)
      } else {
        bookingsCreated++
        console.log(`   📅 Booking created for ${preferredTime.toLocaleDateString()}`)
      }
    }
  }

  console.log('')
  console.log('✨ Test data seeding complete!')
  console.log(`   📞 ${callsCreated} calls created`)
  console.log(`   📅 ${bookingsCreated} bookings created`)
  console.log('')
  console.log('🎉 Dashboard should now show realistic data!')
}

seedTestData().catch(console.error)
