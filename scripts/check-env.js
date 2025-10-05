const fs = require('fs');
const path = require('path');

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VAPI_API_KEY',
  'WEBHOOK_SHARED_SECRET',
  'DEMO_TENANT_ID'
];

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.error('   Create it by copying .env.example');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const missing = REQUIRED_ENV_VARS.filter(key => !envContent.includes(`${key}=`));

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  process.exit(1);
}

console.log('✅ All required environment variables present');
