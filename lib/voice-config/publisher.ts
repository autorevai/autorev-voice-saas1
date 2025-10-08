// lib/voice-config/publisher.ts

import { VapiClient } from '@vapi-ai/server-sdk'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from './prompt-builder'
import { VOICE_IDS, VoiceConfig, PublishResult } from './types'

/**
 * Publishes voice configuration changes to VAPI
 * This actually updates the assistant's voice and system prompt
 */
export async function publishVoiceConfig(tenantId: string): Promise<PublishResult> {
  const startTime = Date.now()
  const db = await createClient()

  console.log('[VOICE_CONFIG] Starting publish for tenant:', tenantId)

  try {
    // 1. Get tenant with assistant and current voice config
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('*, assistants(*)')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      console.error('[VOICE_CONFIG] Tenant fetch error:', tenantError)
      throw new Error('Failed to fetch tenant')
    }

    if (!tenant) {
      throw new Error('Tenant not found')
    }

    // Get the first assistant (primary assistant for this tenant)
    const assistant = tenant.assistants?.[0]
    if (!assistant || !assistant.vapi_assistant_id) {
      throw new Error('No VAPI assistant found for this tenant')
    }

    console.log('[VOICE_CONFIG] Found assistant:', assistant.vapi_assistant_id)

    const config = tenant.voice_config as VoiceConfig
    if (!config) {
      throw new Error('No voice configuration found')
    }

    // 2. Build new system prompt
    const systemPrompt = buildSystemPrompt(tenant, config)
    console.log('[VOICE_CONFIG] Built system prompt, length:', systemPrompt.length)

    // 3. Get existing assistant config to preserve tools
    const vapi = new VapiClient({
      token: process.env.VAPI_API_KEY!
    })

    const existingAssistant = await vapi.assistants.get(assistant.vapi_assistant_id)
    console.log('[VOICE_CONFIG] Retrieved existing assistant config')

    // 4. Update VAPI assistant
    await vapi.assistants.update(assistant.vapi_assistant_id, {
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: systemPrompt
        }],
        // Preserve existing tools
        toolIds: existingAssistant.model?.toolIds || assistant.tool_ids || []
      },
      voice: {
        provider: '11labs',
        voiceId: VOICE_IDS[config.voice],
        stability: 0.5,
        similarityBoost: 0.75,
        model: 'eleven_turbo_v2'
      },
      // Preserve other settings
      firstMessage: existingAssistant.firstMessage,
      server: existingAssistant.server
    })

    console.log('[VOICE_CONFIG] VAPI assistant updated successfully')

    // 5. Update database - mark as published
    const now = new Date().toISOString()

    await db
      .from('tenants')
      .update({
        voice_config_published_at: now,
        voice_config_pending_changes: false
      })
      .eq('id', tenantId)

    // 6. Update assistant record with new system prompt
    await db
      .from('assistants')
      .update({
        system_prompt: systemPrompt,
        settings_json: {
          ...assistant.settings_json,
          lastPublished: now,
          voiceConfig: config
        }
      })
      .eq('id', assistant.id)

    console.log('[VOICE_CONFIG] Database updated')

    const duration = Date.now() - startTime
    console.log(`[VOICE_CONFIG] Publish completed in ${duration}ms`)

    return {
      success: true,
      duration,
      changes: {
        voiceChanged: true,
        promptChanged: true
      }
    }

  } catch (error) {
    console.error('[VOICE_CONFIG] Publish failed:', error)

    // Try to save error state to database
    try {
      await db
        .from('tenants')
        .update({
          voice_config_pending_changes: true // Keep changes pending on error
        })
        .eq('id', tenantId)
    } catch (dbError) {
      console.error('[VOICE_CONFIG] Failed to update error state:', dbError)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish configuration'
    }
  }
}

/**
 * Check if voice config has pending changes
 */
export async function hasPendingChanges(tenantId: string): Promise<boolean> {
  const db = await createClient()

  const { data } = await db
    .from('tenants')
    .select('voice_config_pending_changes')
    .eq('id', tenantId)
    .single()

  return data?.voice_config_pending_changes || false
}
