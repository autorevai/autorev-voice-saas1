#!/bin/bash
# Test webhook endpoint locally or in production

WEBHOOK_URL="${1:-https://autorev-voice-saas1.vercel.app/api/vapi/webhook}"
SECRET="${WEBHOOK_SHARED_SECRET:-k1Vw_3sVdZr9qXnP4aH8Jf2Lr6Tt0BcM}"

echo "🧪 Testing webhook endpoint: $WEBHOOK_URL"
echo ""

# Test 1: Without authentication (should fail)
echo "Test 1: No authentication (should return 401)"
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "status-update",
      "call": { "id": "test-123" }
    }
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 2: With authentication (should succeed)
echo "Test 2: With authentication (should return 200)"
curl -s -X POST "$WEBHOOK_URL" \
  -H "x-vapi-secret: $SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "status-update",
      "call": { "id": "test-456" }
    }
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 3: Invalid payload (should return 400)
echo "Test 3: Invalid payload structure (should return 400)"
curl -s -X POST "$WEBHOOK_URL" \
  -H "x-vapi-secret: $SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "status-update",
    "call": { "id": "test-789" }
  }' | jq '.'

echo ""
echo "---"
echo ""
echo "✅ Tests complete!"
