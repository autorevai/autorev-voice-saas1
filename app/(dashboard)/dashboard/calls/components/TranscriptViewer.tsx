// app/(dashboard)/dashboard/calls/components/TranscriptViewer.tsx
'use client';

import React, { useState } from 'react';
import { FileText, Download, Copy, Check } from 'lucide-react';

interface TranscriptViewerProps {
  call: {
    transcript_url?: string | null;
    raw_json?: {
      transcript?: string;
      summary?: string;
    } | null;
    vapi_call_id?: string;
  };
}

export default function TranscriptViewer({ call }: TranscriptViewerProps) {
  const [copied, setCopied] = useState(false);
  
  // Decode transcript from base64 data URL or fallback to raw_json
  const getTranscript = (): string | null => {
    // Try transcript_url first (base64 encoded)
    if (call?.transcript_url) {
      if (call.transcript_url.startsWith('data:text/plain;base64,')) {
        const base64 = call.transcript_url.replace('data:text/plain;base64,', '');
        try {
          return atob(base64);
        } catch (error) {
          console.error('Failed to decode transcript:', error);
        }
      }
    }
    
    // Fallback to raw_json.transcript
    return call?.raw_json?.transcript || null;
  };
  
  const transcript = getTranscript();
  const summary = call?.raw_json?.summary;
  
  // Copy transcript to clipboard
  const copyTranscript = async () => {
    if (transcript) {
      try {
        await navigator.clipboard.writeText(transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };
  
  // Download transcript as .txt file
  const downloadTranscript = () => {
    if (!transcript) return;
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${call.vapi_call_id || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Show empty state if no transcript
  if (!transcript) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <FileText className="w-5 h-5" />
          <span>No transcript available</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* AI Summary (if available) */}
      {summary && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Call Summary</h3>
          <p className="text-blue-800 text-sm">{summary}</p>
        </div>
      )}
      
      {/* Full Transcript */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Full Transcript</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={copyTranscript}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
            
            {/* Download Button */}
            <button
              onClick={downloadTranscript}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
        
        {/* Scrollable Transcript Text */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
            {transcript}
          </pre>
        </div>
      </div>
    </div>
  );
}
