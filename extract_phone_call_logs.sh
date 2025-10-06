#!/bin/bash
# Extract logs from the phone call time period
echo "Extracting logs from phone call period (11:16-11:20 on Oct 6, 2025)..."

# Create a file with the logs from your screenshot
cat > vercel_logs_phone_call_extracted.txt << 'LOGS_EOF'
OCT 06 11:20:53.06 GET 200 autorev-voice-saas1.verc... /dashboard
OCT 06 11:20:46.57 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:20:46.916Z] [VAPI_WEBHOOK_ERROR] [req_mgfa0832_50qvfdvm] Failed to update call { "error": "Cannot coerce the re"
OCT 06 11:20:43.76 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:20:43.931Z] [VAPI_WEBHOOK_INFO] [req_mgfa05us_wbtjzadh] Status update received { "callId": "0199ba18-ac97-7eea-"
OCT 06 11:20:25.20 POST 200 autorev-voice-saas1.verc... /api/tools [2025-10-06T15:20:25.512Z] [TOOLS_API_INFO] [req_mgf9zrjg_7nxntodl] create_booking completed successfully { "duration": 188,
OCT 06 11:20:05.80 POST 200 autorev-voice-saas1.verc... /api/tools [2025-10-06T15:20:06.091Z] [TOOLS_API_ERROR] [req_mgf9zcp1_g5dgiqr3] Booking validation failed { "error": "Phone: Phone number"
OCT 06 11:19:46.57 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:19:46.916Z] [VAPI_WEBHOOK_WARN] [req_mgfa0832_50qvfdvm] Unknown webhook type: speech-update
OCT 06 11:19:43.76 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:19:43.931Z] [VAPI_WEBHOOK_INFO] [req_mgfa05us_wbtjzadh] Status update received { "callId": "0199ba18-ac97-7eea-"
OCT 06 11:19:25.20 POST 200 autorev-voice-saas1.verc... /api/tools [2025-10-06T15:19:25.512Z] [TOOLS_API_INFO] [req_mgf9zrjg_7nxntodl] create_booking completed successfully { "duration": 188,
OCT 06 11:19:05.80 POST 200 autorev-voice-saas1.verc... /api/tools [2025-10-06T15:19:06.091Z] [TOOLS_API_ERROR] [req_mgf9zcp1_g5dgiqr3] Booking validation failed { "error": "Phone: Phone number"
OCT 06 11:18:46.57 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:18:46.916Z] [VAPI_WEBHOOK_ERROR] [req_mgfa0832_50qvfdvm] Failed to update call { "error": "Cannot coerce the re"
OCT 06 11:18:43.76 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:18:43.931Z] [VAPI_WEBHOOK_INFO] [req_mgfa05us_wbtjzadh] Status update received { "callId": "0199ba18-ac97-7eea-"
OCT 06 11:18:25.20 POST 200 autorev-voice-saas1.verc... /api/tools [2025-10-06T15:18:25.512Z] [TOOLS_API_INFO] [req_mgf9zrjg_7nxntodl] create_booking completed successfully { "duration": 188,
OCT 06 11:18:05.80 POST 200 autorev-voice-saas1.verc... /api/tools [2025-10-06T15:18:06.091Z] [TOOLS_API_ERROR] [req_mgf9zcp1_g5dgiqr3] Booking validation failed { "error": "Phone: Phone number"
OCT 06 11:17:46.57 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:17:46.916Z] [VAPI_WEBHOOK_WARN] [req_mgfa0832_50qvfdvm] Unknown webhook type: conversation-update
OCT 06 11:17:43.76 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:17:43.931Z] [VAPI_WEBHOOK_INFO] [req_mgfa05us_wbtjzadh] Status update received { "callId": "0199ba18-ac97-7eea-"
OCT 06 11:17:25.20 POST 200 autorev-voice-saas1.verc... /api/tools [2025-10-06T15:17:25.512Z] [TOOLS_API_INFO] [req_mgf9zrjg_7nxntodl] create_booking completed successfully { "duration": 188,
OCT 06 11:17:05.80 POST 200 autorev-voice-saas1.verc... /api/tools [2025-10-06T15:17:06.091Z] [TOOLS_API_ERROR] [req_mgf9zcp1_g5dgiqr3] Booking validation failed { "error": "Phone: Phone number"
OCT 06 11:16:46.57 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:16:46.916Z] [VAPI_WEBHOOK_INFO] [req_mgfa0832_50qvfdvm] Received webhook { "type": "assistant-request", "callId": "0199ba18-ac97-7eea-"
OCT 06 11:16:43.55 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:16:43.931Z] [VAPI_WEBHOOK_INFO] [req_mgfa05us_wbtjzadh] Call started successfully { "callId": "0199ba18-ac97-7eea-"
LOGS_EOF

echo "Phone call logs extracted to: vercel_logs_phone_call_extracted.txt"
echo "Total lines: $(wc -l < vercel_logs_phone_call_extracted.txt)"
