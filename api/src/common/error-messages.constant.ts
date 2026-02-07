/**
 * Centralized user-facing error messages for consistent UX across the application.
 * These messages are designed to be:
 * - User-friendly (no technical jargon)
 * - Actionable (tell users what to do)
 * - Consistent (same wording across all services)
 * 
 * Usage:
 * - API: Return these messages in error responses
 * - Frontend: Display these messages to users
 * - Logs: Use technical details, not these messages
 */

export const ERROR_MESSAGES = {
  // AI Service Errors
  AI: {
    RATE_LIMIT: "I'm experiencing high demand right now. Please try again in a moment.",
    SERVER_ERROR: "The AI service is temporarily unavailable. Please try again shortly.",
    TIMEOUT: "The request took too long to complete. Please try a more specific query.",
    CIRCUIT_BREAKER: "The AI service is temporarily paused due to repeated errors. Please try again in a minute.",
    GENERIC: "I apologize, but I encountered an issue processing your request.",
    GENERATION_ERROR: "I apologize, but I encountered an error generating a response.",
  },

  // Network Errors
  NETWORK: {
    CONNECTION_FAILED: "Unable to connect to the service. Please check your internet connection.",
    REQUEST_TIMEOUT: "The request timed out. Please try again.",
    SERVICE_UNAVAILABLE: "The service is temporarily unavailable. Please try again in a few moments.",
  },

  // Authentication Errors
  AUTH: {
    UNAUTHORIZED: "You need to be logged in to access this feature.",
    SESSION_EXPIRED: "Your session has expired. Please log in again.",
    INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
    PERMISSION_DENIED: "You don't have permission to perform this action.",
  },

  // Data Validation Errors
  VALIDATION: {
    REQUIRED_FIELD: "This field is required.",
    INVALID_EMAIL: "Please enter a valid email address.",
    INVALID_PHONE: "Please enter a valid phone number.",
    INVALID_DATE: "Please enter a valid date.",
    INVALID_FORMAT: "The format is invalid. Please check your input.",
  },

  // CRM Operation Errors
  CRM: {
    CREATE_FAILED: "Failed to create the record. Please try again.",
    UPDATE_FAILED: "Failed to update the record. Please try again.",
    DELETE_FAILED: "Failed to delete the record. Please try again.",
    NOT_FOUND: "The requested record was not found.",
    DUPLICATE: "A record with this information already exists.",
  },

  // Document/Search Errors
  DOCUMENT: {
    UPLOAD_FAILED: "Failed to upload the document. Please try again.",
    SEARCH_FAILED: "Failed to search documents. Please try again.",
    NOT_FOUND: "The document was not found.",
    PROCESSING_ERROR: "Failed to process the document. Please ensure it's a valid file.",
  },

  // Email Errors
  EMAIL: {
    SEND_FAILED: "Failed to send the email. Please try again.",
    INVALID_RECIPIENT: "Please provide a valid recipient email address.",
    TRACKING_ERROR: "Failed to track email. The email was sent but tracking is unavailable.",
  },

  // Meeting Errors
  MEETING: {
    SCHEDULE_FAILED: "Failed to schedule the meeting. Please try again.",
    JOIN_FAILED: "Failed to join the meeting. Please check the meeting link.",
    RECORDING_ERROR: "Failed to start recording. Please try again.",
  },

  // Generic Fallbacks
  GENERIC: {
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
    TRY_AGAIN: "Something went wrong. Please try again.",
    CONTACT_SUPPORT: "If this problem persists, please contact support.",
  },
} as const;

/**
 * Get user-friendly error message based on error type and status code
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const statusCode = error.status || error.statusCode || error.response?.status;
  const message = error.message?.toLowerCase() || '';

  // Rate limiting
  if (statusCode === 429 || message.includes('rate limit')) {
    return ERROR_MESSAGES.AI.RATE_LIMIT;
  }

  // Server errors
  if (statusCode >= 500 && statusCode < 600) {
    return ERROR_MESSAGES.AI.SERVER_ERROR;
  }

  // Timeouts
  if (statusCode === 408 || message.includes('timeout')) {
    return ERROR_MESSAGES.AI.TIMEOUT;
  }

  // Circuit breaker
  if (message.includes('circuit breaker') || message.includes('circuit')) {
    return ERROR_MESSAGES.AI.CIRCUIT_BREAKER;
  }

  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return ERROR_MESSAGES.NETWORK.CONNECTION_FAILED;
  }

  // Authentication errors
  if (statusCode === 401) {
    return ERROR_MESSAGES.AUTH.UNAUTHORIZED;
  }

  if (statusCode === 403) {
    return ERROR_MESSAGES.AUTH.PERMISSION_DENIED;
  }

  // Not found
  if (statusCode === 404) {
    return ERROR_MESSAGES.CRM.NOT_FOUND;
  }

  // Generic fallback
  return ERROR_MESSAGES.AI.GENERIC;
}

/**
 * Type-safe error message keys for compile-time checking
 */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
export type AIErrorKey = keyof typeof ERROR_MESSAGES.AI;
export type NetworkErrorKey = keyof typeof ERROR_MESSAGES.NETWORK;
export type AuthErrorKey = keyof typeof ERROR_MESSAGES.AUTH;
export type ValidationErrorKey = keyof typeof ERROR_MESSAGES.VALIDATION;
export type CRMErrorKey = keyof typeof ERROR_MESSAGES.CRM;
export type DocumentErrorKey = keyof typeof ERROR_MESSAGES.DOCUMENT;
export type EmailErrorKey = keyof typeof ERROR_MESSAGES.EMAIL;
export type MeetingErrorKey = keyof typeof ERROR_MESSAGES.MEETING;
export type GenericErrorKey = keyof typeof ERROR_MESSAGES.GENERIC;
