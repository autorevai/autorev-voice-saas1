// lib/request-id.ts
// Request ID generation and management for distributed tracing

import { NextRequest } from 'next/server';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

/**
 * Extract request ID from headers or generate a new one
 */
export function getOrCreateRequestId(req: NextRequest): string {
  // Check for existing request ID in headers
  const existingId =
    req.headers.get('x-request-id') ||
    req.headers.get('x-trace-id') ||
    req.headers.get('x-correlation-id');

  if (existingId) {
    return existingId;
  }

  // Generate new request ID
  return generateRequestId();
}

/**
 * Enhanced logger with request ID support
 */
export function createLogger(requestId: string, component: string) {
  function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry: any = {
      timestamp,
      requestId,
      component,
      level,
      message
    };

    if (data) {
      logEntry.data = data;
    }

    // Format for console output
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    console.log(`[${timestamp}] [${component}_${level}] [${requestId}] ${message}${dataStr}`);
  }

  return {
    info: (message: string, data?: any) => log('INFO', message, data),
    warn: (message: string, data?: any) => log('WARN', message, data),
    error: (message: string, data?: any) => log('ERROR', message, data)
  };
}
