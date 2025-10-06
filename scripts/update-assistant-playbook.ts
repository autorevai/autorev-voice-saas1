// scripts/update-assistant-playbook.ts
// Update existing VAPI assistant with new playbook

import { PLAYBOOK_TEMPLATES } from '../lib/playbooks';

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.argv[2]; // Pass assistant ID as argument

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found in environment');
  process.exit(1);
}

if (!ASSISTANT_ID) {
  console.error('❌ Usage: npm run update-playbook <assistant_id>');
  console.error('   Example: npm run update-playbook 9d1b9795-6a7b-49e7-8c68-ce45895338c3');
  process.exit(1);
}

async function updateAssistantPlaybook() {
  console.log('🔄 Updating assistant playbook...');
  console.log('   Assistant ID:', ASSISTANT_ID);

  const hvacPlaybook = PLAYBOOK_TEMPLATES.hvac;

  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 150,
        messages: [
          {
            role: 'system',
            content: hvacPlaybook.systemPrompt.replace('[Business Name]', 'Test 8 HVAC')
          }
        ]
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Failed to update assistant:', error);
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ Assistant updated successfully!');
  console.log('   Name:', result.name);
  console.log('   ID:', result.id);
  console.log('\n📋 New playbook includes:');
  console.log('   - Only TRUE emergencies (gas, CO, flooding, no heat below 40°F)');
  console.log('   - Auto-use caller ID for phone number');
  console.log('   - Read phone numbers digit-by-digit');
  console.log('\n🧪 Test by calling the assistant now!');
}

updateAssistantPlaybook().catch(console.error);
