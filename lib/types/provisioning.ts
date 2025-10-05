export type Industry = 'hvac' | 'plumbing' | 'electrical' | 'dental' | 'legal' | 'medical';

export type PlanCode = 'starter' | 'core' | 'pro';

export type CallOutcome = 'in_progress' | 'info_collected' | 'qualified' | 'transferred' | 'booked' | 'voicemail' | 'abandoned' | 'spam';

export interface BusinessProfile {
  industry: Industry;
  serviceArea: string[];
  businessHours: {
    weekdays: string;
    weekends: string;
    emergency: boolean;
    emergencyPhone?: string;
  };
  emergencyKeywords: string[];
  routingConfig: {
    sales?: string;
    dispatch?: string;
    billing?: string;
  };
}

export interface ProvisioningConfig {
  tenantId: string;
  businessName: string;
  profile: BusinessProfile;
}

export interface ProvisioningResult {
  success: boolean;
  assistantId?: string;
  phoneNumber?: string;
  error?: string;
}

// Database table types
export interface TenantPlan {
  tenant_id: string;
  plan_code: PlanCode;
  created_at: string;
}

export interface PlanPeriod {
  id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  minutes_included: number;
  minutes_used: number;
  overage_minutes: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BillingUsage {
  id: string;
  tenant_id: string;
  period_date: string;
  minutes: number;
  call_count: number;
  booked_count: number;
  transferred_count: number;
  created_at: string;
  updated_at: string;
}

export interface CallEvent {
  id: string;
  call_id: string;
  tenant_id: string;
  at: string;
  event_type: string;
  payload: any;
  created_at: string;
}

// Extended tenant type with new columns
export interface TenantExtended {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  industry?: Industry;
  service_area?: string[];
  business_hours?: {
    weekdays: string;
    weekends: string;
    emergency: boolean;
  };
  emergency_keywords?: string[];
  setup_completed?: boolean;
  routing_config?: {
    sales?: string | null;
    dispatch?: string | null;
    billing?: string | null;
  };
}

// Extended assistant type with new columns
export interface AssistantExtended {
  id: string;
  tenant_id: string;
  vapi_assistant_id: string;
  vapi_number_id: string | null;
  name: string;
  status: string;
  settings_json: any;
  created_at: string;
  updated_at: string;
  system_prompt?: string;
  voice_config?: {
    provider: string;
    model: string;
    [key: string]: any;
  };
  tools_config?: any[];
  playbook_config?: any;
}
