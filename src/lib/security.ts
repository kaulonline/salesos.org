/**
 * Security utilities for XSS prevention, CSRF protection, and input sanitization
 */

import DOMPurify, { Config } from 'dompurify';

// Configure DOMPurify defaults
const DOMPURIFY_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'pre', 'code',
    'img', 'hr',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'class', 'style', 'id',
    'src', 'alt', 'width', 'height',
    'colspan', 'rowspan',
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // Allow target attribute
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

// Strict config for user-generated content
const STRICT_CONFIG: Config = {
  ...DOMPURIFY_CONFIG,
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'u', 'a', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML string to sanitize
 * @param strict - Use stricter rules for user-generated content
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string, strict = false): string {
  if (!html) return '';

  const config = strict ? STRICT_CONFIG : DOMPURIFY_CONFIG;

  // Add hook to ensure all links open in new tab and have noopener
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const sanitized = DOMPurify.sanitize(html, { ...config, RETURN_TRUSTED_TYPE: false });

  // Remove the hook after use
  DOMPurify.removeHook('afterSanitizeAttributes');

  return sanitized as string;
}

/**
 * Sanitize plain text to prevent XSS when inserting into HTML
 * Escapes all HTML special characters
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return text.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char]);
}

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (dangerousProtocols.some(protocol => trimmed.startsWith(protocol))) {
    return '';
  }

  // Allow relative URLs, http, https, mailto, tel
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:', '//', '/'];
  const hasProtocol = trimmed.includes(':');

  if (hasProtocol && !allowedProtocols.some(protocol => trimmed.startsWith(protocol))) {
    return '';
  }

  return url;
}

/**
 * CSRF Token Management
 */
let csrfToken: string | null = null;

/**
 * Set CSRF token (called after login or from a dedicated endpoint)
 */
export function setCsrfToken(token: string): void {
  csrfToken = token;
  // Also store in sessionStorage for persistence across page reloads
  sessionStorage.setItem('csrf_token', token);
}

/**
 * Get current CSRF token
 */
export function getCsrfToken(): string | null {
  if (!csrfToken) {
    csrfToken = sessionStorage.getItem('csrf_token');
  }
  return csrfToken;
}

/**
 * Clear CSRF token (called on logout)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
  sessionStorage.removeItem('csrf_token');
}

/**
 * Generate a random CSRF token (for double-submit cookie pattern)
 * Note: In production, this should come from the server
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate that a string doesn't contain potential injection patterns
 */
export function containsInjectionPatterns(input: string): boolean {
  if (!input) return false;

  const patterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:\s*text\/html/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /expression\s*\(/i, // CSS expression()
    /url\s*\(\s*["']?\s*javascript/i,
  ];

  return patterns.some(pattern => pattern.test(input));
}

/**
 * Rate limiting helper for client-side throttling
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    };
  }

  record.count++;
  return { allowed: true };
}

/**
 * Clear old rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

export default {
  sanitizeHtml,
  escapeHtml,
  sanitizeUrl,
  setCsrfToken,
  getCsrfToken,
  clearCsrfToken,
  generateCsrfToken,
  containsInjectionPatterns,
  checkRateLimit,
  cleanupRateLimits,
};
