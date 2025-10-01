import { createClient } from '../lib/db'

async function seedDemoTenant() {
  const db = createClient()
  
  try {
    // Check if tenant already exists
    const { data: existingTenant } = await db
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'andersons-demo')
      .single()
    
    if (existingTenant) {
      console.log('✅ Demo tenant already exists:')
      console.log(`   ID: ${existingTenant.id}`)
      console.log(`   Name: ${existingTenant.name}`)
      console.log(`   Slug: ${existingTenant.slug}`)
      return existingTenant.id
    }
    
    // Create new tenant
    const { data, error } = await db
      .from('tenants')
      .insert({
        name: "Anderson's Heating & Cooling",
        slug: 'andersons-demo'
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating tenant:', error)
      process.exit(1)
    }
    
    console.log('✅ Demo tenant created successfully:')
    console.log(`   ID: ${data.id}`)
    console.log(`   Name: ${data.name}`)
    console.log(`   Slug: ${data.slug}`)
    
    return data.id
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
seedDemoTenant()
