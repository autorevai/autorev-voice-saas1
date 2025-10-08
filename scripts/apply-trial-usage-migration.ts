// Apply trial usage columns migration to tenants table
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { readFileSync } from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...')
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20251008000000_add_trial_usage_to_tenants.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('🔧 Applying migration...')
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      // Try direct execution as fallback
      console.log('⚠️  RPC failed, trying direct execution...')

      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'))

      for (const statement of statements) {
        if (!statement) continue
        console.log(`  Executing: ${statement.substring(0, 60)}...`)

        const { error: execError } = await supabase.from('_migrations').select('*').limit(0) // Force a query to test connection

        // We need to use the postgres connection directly
        console.log('  Note: Using service role client, statement execution may be limited')
      }

      console.log('\n⚠️  Cannot execute DDL statements via Supabase client.')
      console.log('Please run this SQL manually in Supabase SQL Editor:')
      console.log('\n' + sql)
      return
    }

    console.log('✅ Migration applied successfully!')
  } catch (error) {
    console.error('❌ Error:', error)
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:')
    const sql = readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/20251008000000_add_trial_usage_to_tenants.sql'),
      'utf-8'
    )
    console.log('\n' + sql)
  }
}

applyMigration()
