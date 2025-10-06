// app/api/vapi/webhook/route.ts
// PRODUCTION-READY VERSION WITH ROBUST LOGGING

import { createClient } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateRequestId, createLogger } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getOrCreateRequestId(req);
  const log = createLogger(requestId, 'VAPI_WEBHOOK');
  
  try {
    // Parse webhook payload
    const rawBody = await req.text();
    log.info('Received webhook', { 
      bodyLength: rawBody.length,
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url
    });
    
    const event = JSON.parse(rawBody);
    log.info('Parsed webhook event', { 
      type: event?.message?.type,
      callId: event?.message?.call?.id,
      fullPayload: event
    });

    // Extract message and call data
    const message = event?.message || event;
    const messageType = message?.type;
    const call = message?.call;
    const callId = call?.id;

    if (!callId) {
      log.warn('No call ID in webhook', { messageType, event });
      return NextResponse.json({ received: true, requestId }, { status: 200 });
    }

    // Initialize Supabase client
    const supabase = createClient();
    log.info('Supabase client created');

    // Get tenant ID (use demo tenant for now)
    const tenantId = process.env.DEMO_TENANT_ID;
    if (!tenantId) {
      log.error('DEMO_TENANT_ID not set in environment');
      return NextResponse.json({ error: 'Configuration error', requestId }, { status: 500 });
    }

    log.info(`Processing webhook type: ${messageType} for call: ${callId}`);

    // Handle different webhook types
    switch (messageType) {
      case 'assistant-request': {
        log.info('Handling assistant-request');
        
        // Check if call already exists
        const { data: existingCall, error: checkError } = await supabase
          .from('calls')
          .select('id')
          .eq('vapi_call_id', callId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          log.error('Error checking existing call', checkError);
        }

        if (!existingCall) {
          log.info('Creating new call record', { callId, tenantId });
          
          const { data: newCall, error: insertError } = await supabase
            .from('calls')
            .insert({
              tenant_id: tenantId,
              vapi_call_id: callId,
              started_at: call?.startedAt || new Date().toISOString(),
              outcome: 'unknown',
              raw_json: call || {}
            })
            .select()
            .single();

          if (insertError) {
            log.error('Failed to insert call', { error: insertError, callId });
          } else {
            log.info('Call created successfully', { 
              dbCallId: newCall.id, 
              vapiCallId: callId 
            });
          }
        } else {
          log.info('Call already exists', { callId });
        }
        break;
      }

      case 'end-of-call-report': {
        log.info('Handling end-of-call-report');

        const endedAt = message?.endedAt;
        const durationSec = Math.round(message?.durationSeconds || 0);
        const transcript = message?.transcript || null;
        const summary = message?.summary || null;
        const endedReason = message?.endedReason || null;

        log.info('Call ended details', {
          callId,
          durationSec,
          hasTranscript: !!transcript,
          transcriptLength: transcript?.length || 0,
          endedReason
        });

        // Update call with end data
        const { data: updatedCall, error: updateError } = await supabase
          .from('calls')
          .update({
            ended_at: endedAt || new Date().toISOString(),
            duration_sec: durationSec,
            transcript_url: transcript 
              ? `data:text/plain;base64,${Buffer.from(transcript).toString('base64')}` 
              : null,
            raw_json: { 
              ...call,
              transcript, 
              summary, 
              endedReason,
              fullMessage: message 
            }
          })
          .eq('vapi_call_id', callId)
          .select()
          .single();

        if (updateError) {
          log.error('Failed to update call', { error: updateError, callId });
        } else {
          log.info('Call updated successfully', {
            dbCallId: updatedCall.id,
            vapiCallId: callId,
            duration: durationSec
          });
        }
        break;
      }

      case 'status-update': {
        log.info('Status update received', {
          callId,
          status: message?.status
        });
        break;
      }

      case 'tool-calls': {
        log.info('Tool calls received', {
          callId,
          toolCount: message?.toolCalls?.length || 0
        });
        
        // Log each tool call for debugging
        if (message?.toolCalls) {
          for (const toolCall of message.toolCalls) {
            log.info('Tool call details', {
              name: toolCall.function?.name,
              args: toolCall.function?.arguments
            });
          }
        }
        break;
      }

      default: {
        log.warn('Unknown webhook type', {
          type: messageType,
          callId,
          keys: Object.keys(message)
        });
      }
    }

    const duration = Date.now() - startTime;
    log.info(`Webhook processed successfully in ${duration}ms`);

    return NextResponse.json({
      received: true,
      processed: messageType,
      callId,
      duration,
      requestId
    }, { status: 200 });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error('Webhook processing failed', {
      error: error.message,
      stack: error.stack,
      duration
    });
    
    return NextResponse.json({
      error: 'Webhook processing failed',
      message: error.message,
      requestId
    }, { status: 500 });
  }
}