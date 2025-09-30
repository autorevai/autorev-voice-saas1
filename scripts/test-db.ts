import { createClient } from '../lib/db'

async function test() {
  const db = createClient()
  
  // Insert test tenant
  const { data, error } = await db
    .from('tenants')
    .insert({ name: 'Test HVAC Co', slug: 'test-hvac' })
    .select()
    .single()
  
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }
  
  console.log('✅ Test tenant created:', data)
  console.log('✅ Database connection works!')
}

test()
