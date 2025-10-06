// scripts/verify-assistant-playbook.ts
// Verify the current playbook in VAPI

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.argv[2];

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found in environment');
  process.exit(1);
}

if (!ASSISTANT_ID) {
  console.error('❌ Usage: npm run verify-playbook <assistant_id>');
  process.exit(1);
}

async function verifyAssistantPlaybook() {
  console.log('🔍 Fetching assistant config from VAPI...');
  console.log('   Assistant ID:', ASSISTANT_ID);

  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Failed to fetch assistant:', error);
    process.exit(1);
  }

  const assistant = await response.json();

  console.log('\n📋 ASSISTANT CONFIG:');
  console.log('   Name:', assistant.name);
  console.log('   ID:', assistant.id);
  console.log('   Model Provider:', assistant.model?.provider);
  console.log('   Model:', assistant.model?.model);
  console.log('\n💬 SYSTEM PROMPT:');
  console.log('─'.repeat(80));

  if (assistant.model?.messages?.[0]?.content) {
    const content = assistant.model.messages[0].content;
    console.log(content);
    console.log('─'.repeat(80));

    // Check for key phrases
    console.log('\n🔍 CHECKING KEY REQUIREMENTS:');

    const checks = [
      {
        label: 'Emergency handling (gas/CO/flooding only)',
        test: content.includes('ONLY transfer to dispatch for TRUE emergencies') ||
              content.includes('Only TRUE emergencies')
      },
      {
        label: 'AC not emergency',
        test: content.includes('AC not working') &&
              (content.includes('uncomfortable but not emergency') ||
               content.includes('REGULAR SERVICE'))
      },
      {
        label: 'Asks for phone number',
        test: content.includes('What\'s the best phone number') ||
              content.includes('ask for their phone number')
      },
      {
        label: 'Digit-by-digit phone reading',
        test: content.includes('digit by digit') ||
              content.includes('digit-by-digit') ||
              content.includes('seven four zero')
      }
    ];

    checks.forEach(check => {
      const status = check.test ? '✅' : '❌';
      console.log(`${status} ${check.label}`);
    });
  } else {
    console.log('❌ No system prompt found');
  }
}

verifyAssistantPlaybook().catch(console.error);
