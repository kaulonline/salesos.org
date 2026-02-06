/**
 * Lightweight form validation library
 * Provides common validation rules and schema-based validation
 */

// Validation result type
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// Validator function type
export type Validator<T = unknown> = (value: T, allValues?: Record<string, unknown>) => string | null;

// Schema definition type
export type ValidationSchema<T extends Record<string, unknown>> = {
  [K in keyof T]?: Validator<T[K]>[];
};

/**
 * Built-in validators
 */
export const validators = {
  /**
   * Required field validator
   */
  required: (message = 'This field is required'): Validator => (value) => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return null;
  },

  /**
   * Email format validator
   */
  email: (message = 'Please enter a valid email address'): Validator<string> => (value) => {
    if (!value) return null; // Don't validate empty - use required for that
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : message;
  },

  /**
   * Phone number validator (basic format)
   */
  phone: (message = 'Please enter a valid phone number'): Validator<string> => (value) => {
    if (!value) return null;
    // Allow various formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    const digitsOnly = value.replace(/\D/g, '');
    if (!phoneRegex.test(value) || digitsOnly.length < 7 || digitsOnly.length > 15) {
      return message;
    }
    return null;
  },

  /**
   * URL validator
   */
  url: (message = 'Please enter a valid URL'): Validator<string> => (value) => {
    if (!value) return null;
    try {
      new URL(value.startsWith('http') ? value : `https://${value}`);
      return null;
    } catch {
      return message;
    }
  },

  /**
   * Minimum length validator
   */
  minLength: (min: number, message?: string): Validator<string> => (value) => {
    if (!value) return null;
    const msg = message || `Must be at least ${min} characters`;
    return value.length >= min ? null : msg;
  },

  /**
   * Maximum length validator
   */
  maxLength: (max: number, message?: string): Validator<string> => (value) => {
    if (!value) return null;
    const msg = message || `Must be no more than ${max} characters`;
    return value.length <= max ? null : msg;
  },

  /**
   * Minimum value validator (for numbers)
   */
  min: (min: number, message?: string): Validator<number> => (value) => {
    if (value === null || value === undefined) return null;
    const msg = message || `Must be at least ${min}`;
    return value >= min ? null : msg;
  },

  /**
   * Maximum value validator (for numbers)
   */
  max: (max: number, message?: string): Validator<number> => (value) => {
    if (value === null || value === undefined) return null;
    const msg = message || `Must be no more than ${max}`;
    return value <= max ? null : msg;
  },

  /**
   * Pattern validator (regex)
   */
  pattern: (regex: RegExp, message = 'Invalid format'): Validator<string> => (value) => {
    if (!value) return null;
    return regex.test(value) ? null : message;
  },

  /**
   * Custom validator - for complex validation logic
   */
  custom: <T>(
    validateFn: (value: T, allValues?: Record<string, unknown>) => boolean,
    message: string
  ): Validator<T> => (value, allValues) => {
    return validateFn(value, allValues) ? null : message;
  },

  /**
   * Match another field validator
   */
  matches: (fieldName: string, message?: string): Validator => (value, allValues) => {
    if (!allValues) return null;
    const otherValue = allValues[fieldName];
    const msg = message || `Must match ${fieldName}`;
    return value === otherValue ? null : msg;
  },

  /**
   * Date validator - checks if value is a valid date
   */
  date: (message = 'Please enter a valid date'): Validator<string> => (value) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? message : null;
  },

  /**
   * Future date validator
   */
  futureDate: (message = 'Date must be in the future'): Validator<string> => (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date > new Date() ? null : message;
  },

  /**
   * Positive number validator
   */
  positive: (message = 'Must be a positive number'): Validator<number> => (value) => {
    if (value === null || value === undefined) return null;
    return value > 0 ? null : message;
  },

  /**
   * Integer validator
   */
  integer: (message = 'Must be a whole number'): Validator<number> => (value) => {
    if (value === null || value === undefined) return null;
    return Number.isInteger(value) ? null : message;
  },
};

/**
 * Validate a single field against an array of validators
 */
export function validateField<T>(
  value: T,
  fieldValidators: Validator<T>[],
  allValues?: Record<string, unknown>
): string | null {
  for (const validator of fieldValidators) {
    const error = validator(value, allValues);
    if (error) return error;
  }
  return null;
}

/**
 * Validate an entire form against a schema
 */
export function validateForm<T extends Record<string, unknown>>(
  values: T,
  schema: ValidationSchema<T>
): ValidationResult {
  const errors: Record<string, string> = {};
  let valid = true;

  for (const [field, fieldValidators] of Object.entries(schema)) {
    if (!fieldValidators) continue;

    const value = values[field as keyof T];
    const error = validateField(value, fieldValidators as Validator[], values as Record<string, unknown>);

    if (error) {
      errors[field] = error;
      valid = false;
    }
  }

  return { valid, errors };
}

/**
 * Create a reusable schema validator
 */
export function createValidator<T extends Record<string, unknown>>(schema: ValidationSchema<T>) {
  return (values: T): ValidationResult => validateForm(values, schema);
}

/**
 * Security-focused validators
 * Detect potential injection patterns in user input
 */
export const securityValidators = {
  /**
   * Check for potential SQL injection patterns
   */
  noSqlInjection: (message = 'Input contains invalid characters'): Validator<string> => (value) => {
    if (!value) return null;
    // Common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
      /(\b(OR|AND)\s+[\d\w]+\s*=\s*[\d\w]+)/i,
      /(--|\#|\/\*)/,
      /(\bEXEC\b|\bEXECUTE\b)/i,
      /(';|";)/,
    ];
    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        return message;
      }
    }
    return null;
  },

  /**
   * Check for potential XSS patterns
   */
  noXss: (message = 'Input contains potentially unsafe content'): Validator<string> => (value) => {
    if (!value) return null;
    const xssPatterns = [
      /<script\b/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b/i,
      /<object\b/i,
      /<embed\b/i,
      /data:\s*text\/html/i,
      /expression\s*\(/i,
    ];
    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        return message;
      }
    }
    return null;
  },

  /**
   * Safe string - combines common security checks
   */
  safeString: (message = 'Input contains invalid content'): Validator<string> => (value) => {
    if (!value) return null;
    const sqlCheck = securityValidators.noSqlInjection(message)(value);
    if (sqlCheck) return sqlCheck;
    const xssCheck = securityValidators.noXss(message)(value);
    if (xssCheck) return xssCheck;
    return null;
  },

  /**
   * Alphanumeric only (with optional spaces/dashes/underscores)
   */
  alphanumeric: (allowSpaces = true, message = 'Only letters and numbers allowed'): Validator<string> => (value) => {
    if (!value) return null;
    const pattern = allowSpaces ? /^[a-zA-Z0-9\s\-_]+$/ : /^[a-zA-Z0-9]+$/;
    return pattern.test(value) ? null : message;
  },

  /**
   * Validate file name (no path traversal)
   */
  safeFileName: (message = 'Invalid file name'): Validator<string> => (value) => {
    if (!value) return null;
    // Block path traversal attempts
    if (value.includes('..') || value.includes('/') || value.includes('\\')) {
      return message;
    }
    // Block null bytes
    if (value.includes('\0')) {
      return message;
    }
    return null;
  },
};

// Common validation schemas for reuse
export const commonSchemas = {
  /**
   * Lead/Contact name validation
   */
  name: [validators.required(), validators.minLength(2), validators.maxLength(100)],

  /**
   * Email validation
   */
  email: [validators.required(), validators.email()],

  /**
   * Optional email validation
   */
  optionalEmail: [validators.email()],

  /**
   * Phone validation
   */
  phone: [validators.phone()],

  /**
   * Required phone validation
   */
  requiredPhone: [validators.required(), validators.phone()],

  /**
   * URL validation
   */
  url: [validators.url()],

  /**
   * Currency amount validation
   */
  amount: [validators.required(), validators.min(0)],

  /**
   * Percentage validation (0-100)
   */
  percentage: [validators.min(0), validators.max(100)],

  /**
   * Description/notes validation
   */
  description: [validators.maxLength(2000)],
};

export default validators;
