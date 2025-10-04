// scripts/provision-tenant.ts
import { provisionAssistantForTenant } from '../services/vapi';

async function main() {
  const tenantId = process.argv[2] || 'tenant-demo';
  const businessName = process.argv[3] || 'Anderson\'s Heating & Cooling';
  const market = (process.argv[4] as any) || 'hvac';

  const res = await provisionAssistantForTenant({ id: tenantId, businessName, market });
  console.log('Assistant ID:', res.assistantId);
  console.log('Phone Number:', res.phoneNumber);
}

main().catch((e) => { console.error(e); process.exit(1); });
