'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Phone, MapPin, DollarSign, MessageSquare, Wrench, Clock } from 'lucide-react';

interface ToolResult {
  id: string;
  tool_name: string;
  request_json: any;
  response_json: any;
  success: boolean;
  created_at: string;
}

interface ToolResultCardProps {
  result: ToolResult;
  index: number;
}

export default function ToolResultCard({ result, index }: ToolResultCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderToolContent = () => {
    const { tool_name, request_json, response_json, success } = result;

    switch (tool_name) {
      case 'create_booking':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="font-medium">{request_json?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{request_json?.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="font-medium">{request_json?.address || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Time Window</p>
                  <p className="font-medium">{request_json?.time_window || 'N/A'}</p>
                </div>
              </div>
            </div>
            {success && response_json?.confirmation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Confirmation:</span> {response_json.confirmation}
                </p>
              </div>
            )}
          </div>
        );

      case 'handoff_sms':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{request_json?.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">SMS Type</p>
                  <p className="font-medium">{response_json?.sms_type || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Message</p>
              <p className="text-sm bg-gray-50 rounded p-2 border">
                {request_json?.message || response_json?.message || 'N/A'}
              </p>
            </div>
          </div>
        );

      case 'quote_estimate':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Task</p>
                  <p className="font-medium">{request_json?.task || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Price Range</p>
                  <p className="font-medium">{response_json?.price_range || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <div>
                  <p className="text-xs text-gray-500">Service Type</p>
                  <p className="font-medium">{response_json?.service_type || 'N/A'}</p>
                </div>
              </div>
            </div>
            {request_json?.equipment && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Equipment</p>
                <p className="text-sm bg-gray-50 rounded p-2 border">
                  {request_json.equipment}
                </p>
              </div>
            )}
          </div>
        );

      case 'update_crm_note':
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Note</p>
              <p className="text-sm bg-gray-50 rounded p-2 border">
                {request_json?.note || request_json?.message || 'N/A'}
              </p>
            </div>
            {request_json?.customer_name && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="font-medium">{request_json.customer_name}</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Request Data</p>
              <p className="text-sm bg-gray-50 rounded p-2 border">
                {Object.keys(request_json || {}).length > 0 
                  ? JSON.stringify(request_json, null, 2)
                  : 'No data available'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Response Data</p>
              <p className="text-sm bg-gray-50 rounded p-2 border">
                {Object.keys(response_json || {}).length > 0 
                  ? JSON.stringify(response_json, null, 2)
                  : 'No data available'
                }
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-900">
            Tool #{index + 1}: {result.tool_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            result.success 
              ? 'text-green-700 bg-green-100 border border-green-200' 
              : 'text-red-700 bg-red-100 border border-red-200'
          }`}>
            {result.success ? 'Success' : 'Failed'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {formatDateTime(result.created_at)}
          </span>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span>Advanced</span>
            {showAdvanced ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Formatted Content */}
      <div className="mb-4">
        {renderToolContent()}
      </div>

      {/* Advanced JSON View */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Request JSON
              </h4>
              <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto max-h-64">
                {JSON.stringify(result.request_json, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Response JSON
              </h4>
              <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto max-h-64">
                {JSON.stringify(result.response_json, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}