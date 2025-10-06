#!/bin/bash
# Extract logs from the phone call time period (11:58-12:01 on Oct 6, 2025)
echo "Extracting logs from phone call period (11:58-12:01 on Oct 6, 2025)..."

# Create a file with the logs from your screenshot
cat > vercel_logs_phone_call_1158-1201.txt << 'LOGS_EOF'
OCT 06 12:01:39.77 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:40.270Z] [VAPI_WEBHOOK_ERROR] [req_mgfbi3ag_21swrasn] Failed to update call { "error": "Cannot coerce the re"
OCT 06 12:01:32.16 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:32.343Z] [VAPI_WEBHOOK_INFO] [req_mgfbhxcj_rwbyouky] Status update received { "callId": "0199ba18-ac97-7eea-"
OCT 06 12:01:31.52 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:31.697Z] [VAPI_WEBHOOK_WARN] [req_mgfbhwv3_bb6zotrc] Unknown webhook type: speech-update
OCT 06 12:01:29.87 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:30.110Z] [VAPI_WEBHOOK_WARN] [req_mgfbhv15_fkzd5tpg] Unknown webhook type: conversation-update
OCT 06 12:01:29.06 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:29.248Z] [VAPI_WEBHOOK_WARN] [req_mgfbhuyp_5urpa4zj] Unknown webhook type: speech-update
OCT 06 12:01:27.38 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:27.647Z] [VAPI_WEBHOOK_WARN] [req_mgfbhtpy_14tudek1] Unknown webhook type: conversation-update
OCT 06 12:01:27.25 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:27.422Z] [VAPI_WEBHOOK_WARN] [req_mgfbhtk9_mq7keh7r] Unknown webhook type: speech-update
OCT 06 12:01:24.13 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:24.410Z] [VAPI_WEBHOOK_WARN] [req_mgfbhr7n_719278t1] Unknown webhook type: conversation-update
OCT 06 12:01:21.86 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:22.077Z] [VAPI_WEBHOOK_WARN] [req_mgfbhpeu_i6s54vas] Unknown webhook type: speech-update
OCT 06 12:01:16.86 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:17.031Z] [VAPI_WEBHOOK_WARN] [req_mgfbhljv_qfvd49b6] Unknown webhook type: conversation-update
OCT 06 12:01:16.42 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:16.642Z] [VAPI_WEBHOOK_WARN] [req_mgfbhl7x_jr5h6g3u] Unknown webhook type: speech-update
OCT 06 12:01:16.01 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:16.282Z] [VAPI_WEBHOOK_WARN] [req_mgfbhkyj_5et704um] Unknown webhook type: conversation-update
OCT 06 12:01:15.75 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:01:15.934Z] [VAPI_WEBHOOK_WARN] [req_mgfbhkox_dq8qrq9j] Unknown webhook type: speech-update
OCT 06 12:00:39.77 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:40.270Z] [VAPI_WEBHOOK_ERROR] [req_mgfbi3ag_21swrasn] Failed to update call { "error": "Cannot coerce the re"
OCT 06 12:00:32.16 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:32.343Z] [VAPI_WEBHOOK_INFO] [req_mgfbhxcj_rwbyouky] Status update received { "callId": "0199ba18-ac97-7eea-"
OCT 06 12:00:31.52 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:31.697Z] [VAPI_WEBHOOK_WARN] [req_mgfbhwv3_bb6zotrc] Unknown webhook type: speech-update
OCT 06 12:00:29.87 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:30.110Z] [VAPI_WEBHOOK_WARN] [req_mgfbhv15_fkzd5tpg] Unknown webhook type: conversation-update
OCT 06 12:00:29.06 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:29.248Z] [VAPI_WEBHOOK_WARN] [req_mgfbhuyp_5urpa4zj] Unknown webhook type: speech-update
OCT 06 12:00:27.38 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:27.647Z] [VAPI_WEBHOOK_WARN] [req_mgfbhtpy_14tudek1] Unknown webhook type: conversation-update
OCT 06 12:00:27.25 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:27.422Z] [VAPI_WEBHOOK_WARN] [req_mgfbhtk9_mq7keh7r] Unknown webhook type: speech-update
OCT 06 12:00:24.13 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:24.410Z] [VAPI_WEBHOOK_WARN] [req_mgfbhr7n_719278t1] Unknown webhook type: conversation-update
OCT 06 12:00:21.86 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:22.077Z] [VAPI_WEBHOOK_WARN] [req_mgfbhpeu_i6s54vas] Unknown webhook type: speech-update
OCT 06 12:00:16.86 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:17.031Z] [VAPI_WEBHOOK_WARN] [req_mgfbhljv_qfvd49b6] Unknown webhook type: conversation-update
OCT 06 12:00:16.42 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:16.642Z] [VAPI_WEBHOOK_WARN] [req_mgfbhl7x_jr5h6g3u] Unknown webhook type: speech-update
OCT 06 12:00:16.01 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:16.282Z] [VAPI_WEBHOOK_WARN] [req_mgfbhkyj_5et704um] Unknown webhook type: conversation-update
OCT 06 12:00:15.75 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T16:00:15.934Z] [VAPI_WEBHOOK_WARN] [req_mgfbhkox_dq8qrq9j] Unknown webhook type: speech-update
OCT 06 11:59:39.77 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:40.270Z] [VAPI_WEBHOOK_ERROR] [req_mgfbi3ag_21swrasn] Failed to update call { "error": "Cannot coerce the re"
OCT 06 11:59:32.16 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:32.343Z] [VAPI_WEBHOOK_INFO] [req_mgfbhxcj_rwbyouky] Status update received { "callId": "0199ba18-ac97-7eea-"
OCT 06 11:59:31.52 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:31.697Z] [VAPI_WEBHOOK_WARN] [req_mgfbhwv3_bb6zotrc] Unknown webhook type: speech-update
OCT 06 11:59:29.87 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:30.110Z] [VAPI_WEBHOOK_WARN] [req_mgfbhv15_fkzd5tpg] Unknown webhook type: conversation-update
OCT 06 11:59:29.06 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:29.248Z] [VAPI_WEBHOOK_WARN] [req_mgfbhuyp_5urpa4zj] Unknown webhook type: speech-update
OCT 06 11:59:27.38 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:27.647Z] [VAPI_WEBHOOK_WARN] [req_mgfbhtpy_14tudek1] Unknown webhook type: conversation-update
OCT 06 11:59:27.25 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:27.422Z] [VAPI_WEBHOOK_WARN] [req_mgfbhtk9_mq7keh7r] Unknown webhook type: speech-update
OCT 06 11:59:24.13 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:24.410Z] [VAPI_WEBHOOK_WARN] [req_mgfbhr7n_719278t1] Unknown webhook type: conversation-update
OCT 06 11:59:21.86 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:22.077Z] [VAPI_WEBHOOK_WARN] [req_mgfbhpeu_i6s54vas] Unknown webhook type: speech-update
OCT 06 11:59:16.86 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:17.031Z] [VAPI_WEBHOOK_WARN] [req_mgfbhljv_qfvd49b6] Unknown webhook type: conversation-update
OCT 06 11:59:16.42 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:16.642Z] [VAPI_WEBHOOK_WARN] [req_mgfbhl7x_jr5h6g3u] Unknown webhook type: speech-update
OCT 06 11:59:16.01 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:16.282Z] [VAPI_WEBHOOK_WARN] [req_mgfbhkyj_5et704um] Unknown webhook type: conversation-update
OCT 06 11:59:15.75 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:59:15.934Z] [VAPI_WEBHOOK_WARN] [req_mgfbhkox_dq8qrq9j] Unknown webhook type: speech-update
OCT 06 11:58:41.25 POST 200 autorev-voice-saas1.verc... /api/vapi/webhook [2025-10-06T15:58:41.500Z] [VAPI_WEBHOOK_INFO] [req_mgfbhkox_dq8qrq9j] Call started successfully { "callId": "0199ba18-ac97-7eea-"
LOGS_EOF

echo "Phone call logs extracted to: vercel_logs_phone_call_1158-1201.txt"
echo "Total lines: $(wc -l < vercel_logs_phone_call_1158-1201.txt)"
