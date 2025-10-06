// lib/validation.ts
// Input validation utilities for API endpoints

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: any;
}

/**
 * Validate and sanitize phone number
 * Accepts formats: +1234567890, 1234567890, (123) 456-7890, 123-456-7890
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Check if it's a valid length (10-15 digits)
  const digitsOnly = cleaned.replace(/\+/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number must be 10-15 digits' };
  }

  // Ensure + is only at the start if present
  if (cleaned.includes('+') && !cleaned.startsWith('+')) {
    return { valid: false, error: 'Invalid phone number format' };
  }

  return {
    valid: true,
    sanitized: cleaned.startsWith('+') ? cleaned : `+1${digitsOnly}`
  };
}

/**
 * Validate email address
 */
export function validateEmail(email: string | null | undefined): ValidationResult {
  // Email is optional in many cases
  if (!email) {
    return { valid: true, sanitized: null };
  }

  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate physical address
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }

  const trimmed = address.trim();

  if (trimmed.length < 5) {
    return { valid: false, error: 'Address is too short' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Address is too long' };
  }

  // Basic validation: should contain at least one number and one letter
  const hasNumber = /\d/.test(trimmed);
  const hasLetter = /[a-zA-Z]/.test(trimmed);

  if (!hasNumber || !hasLetter) {
    return { valid: false, error: 'Address must contain both numbers and letters' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate customer name
 */
export function validateName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name is too short' };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: 'Name is too long' };
  }

  // Should contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Name must contain letters' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate ZIP code (US and international)
 */
export function validateZip(zip: string | null | undefined): ValidationResult {
  // ZIP is optional
  if (!zip) {
    return { valid: true, sanitized: null };
  }

  if (typeof zip !== 'string') {
    return { valid: false, error: 'ZIP code must be a string' };
  }

  const trimmed = zip.trim();

  // US ZIP: 12345 or 12345-6789
  const usZipRegex = /^\d{5}(-\d{4})?$/;

  // International postal codes: alphanumeric, 3-10 characters
  const intlZipRegex = /^[a-zA-Z0-9\s-]{3,10}$/;

  if (!usZipRegex.test(trimmed) && !intlZipRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid ZIP/postal code format' };
  }

  return { valid: true, sanitized: trimmed.toUpperCase() };
}

/**
 * Validate city name
 */
export function validateCity(city: string | null | undefined): ValidationResult {
  // City is optional
  if (!city) {
    return { valid: true, sanitized: null };
  }

  if (typeof city !== 'string') {
    return { valid: false, error: 'City must be a string' };
  }

  const trimmed = city.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'City name is too short' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'City name is too long' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate state (US states or international provinces)
 */
export function validateState(state: string | null | undefined): ValidationResult {
  // State is optional
  if (!state) {
    return { valid: true, sanitized: null };
  }

  if (typeof state !== 'string') {
    return { valid: false, error: 'State must be a string' };
  }

  const trimmed = state.trim().toUpperCase();

  if (trimmed.length < 2) {
    return { valid: false, error: 'State is too short' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'State is too long' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate booking data (composite validation)
 */
export interface BookingData {
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  service_type: string;
  preferred_time?: string;
  equipment_info?: string;
}

export function validateBookingData(data: Partial<BookingData>): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  // Validate required fields
  const nameResult = validateName(data.name || '');
  if (!nameResult.valid) {
    errors.push(`Name: ${nameResult.error}`);
  } else {
    sanitized.name = nameResult.sanitized;
  }

  const phoneResult = validatePhone(data.phone || '');
  if (!phoneResult.valid) {
    errors.push(`Phone: ${phoneResult.error}`);
  } else {
    sanitized.phone = phoneResult.sanitized;
  }

  const addressResult = validateAddress(data.address || '');
  if (!addressResult.valid) {
    errors.push(`Address: ${addressResult.error}`);
  } else {
    sanitized.address = addressResult.sanitized;
  }

  // Validate optional fields
  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) {
    errors.push(`Email: ${emailResult.error}`);
  } else {
    sanitized.email = emailResult.sanitized;
  }

  const cityResult = validateCity(data.city);
  if (!cityResult.valid) {
    errors.push(`City: ${cityResult.error}`);
  } else {
    sanitized.city = cityResult.sanitized;
  }

  const stateResult = validateState(data.state);
  if (!stateResult.valid) {
    errors.push(`State: ${stateResult.error}`);
  } else {
    sanitized.state = stateResult.sanitized;
  }

  const zipResult = validateZip(data.zip);
  if (!zipResult.valid) {
    errors.push(`ZIP: ${zipResult.error}`);
  } else {
    sanitized.zip = zipResult.sanitized;
  }

  // Copy through other fields
  if (data.service_type) {
    sanitized.service_type = data.service_type;
  }
  if (data.preferred_time) {
    sanitized.preferred_time = data.preferred_time;
  }
  if (data.equipment_info) {
    sanitized.equipment_info = data.equipment_info;
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  return { valid: true, sanitized };
}
