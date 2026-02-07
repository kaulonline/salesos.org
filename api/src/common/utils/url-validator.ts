/**
 * URL Validator for SSRF Protection
 *
 * This utility validates webhook URLs to prevent Server-Side Request Forgery (SSRF) attacks.
 * It blocks requests to internal networks, localhost, and dangerous protocols.
 */

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

// Private/internal IP ranges that should be blocked
const BLOCKED_IP_RANGES = [
  // Loopback (127.0.0.0/8)
  { start: ipToNumber('127.0.0.0'), end: ipToNumber('127.255.255.255') },
  // Private Class A (10.0.0.0/8)
  { start: ipToNumber('10.0.0.0'), end: ipToNumber('10.255.255.255') },
  // Private Class B (172.16.0.0/12)
  { start: ipToNumber('172.16.0.0'), end: ipToNumber('172.31.255.255') },
  // Private Class C (192.168.0.0/16)
  { start: ipToNumber('192.168.0.0'), end: ipToNumber('192.168.255.255') },
  // Link-local / Cloud metadata (169.254.0.0/16)
  { start: ipToNumber('169.254.0.0'), end: ipToNumber('169.254.255.255') },
  // Current network (0.0.0.0/8)
  { start: ipToNumber('0.0.0.0'), end: ipToNumber('0.255.255.255') },
];

// Hostnames that should be blocked
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  // AWS metadata endpoints
  'metadata.google.internal',
  'metadata.goog',
  // Common internal hostnames
  'internal',
  'local',
  'intranet',
];

// Dangerous protocols that should be blocked
const BLOCKED_PROTOCOLS = [
  'file:',
  'ftp:',
  'gopher:',
  'data:',
  'javascript:',
  'vbscript:',
  'about:',
  'blob:',
  'dict:',
  'ldap:',
  'ldaps:',
  'sftp:',
  'tftp:',
  'telnet:',
  'ssh:',
];

/**
 * Convert an IPv4 address string to a number for range comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Check if an IP address is in a blocked range
 */
function isBlockedIp(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  if (ipNum === -1) {
    // Not a valid IPv4, could be IPv6 - check for IPv6 loopback
    if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
      return true;
    }
    return false;
  }

  for (const range of BLOCKED_IP_RANGES) {
    if (ipNum >= range.start && ipNum <= range.end) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a hostname is in the blocked list
 */
function isBlockedHostname(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  // Check exact matches
  if (BLOCKED_HOSTNAMES.includes(lowerHostname)) {
    return true;
  }

  // Check if it ends with a blocked hostname pattern
  for (const blocked of BLOCKED_HOSTNAMES) {
    if (lowerHostname.endsWith('.' + blocked)) {
      return true;
    }
  }

  // Check for numeric IP addresses in hostname
  if (isBlockedIp(hostname)) {
    return true;
  }

  return false;
}

/**
 * Check if the hostname might resolve to a private IP
 * This checks for suspicious patterns that could bypass DNS resolution
 */
function hasSuspiciousHostname(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  // Block hostnames that look like they're trying to access internal services
  const suspiciousPatterns = [
    /^[\d.]+$/, // Pure IP address patterns
    /^0x[0-9a-f]+$/i, // Hex-encoded addresses
    /^[0-7]+$/, // Octal addresses
    /^\d+$/, // Decimal-encoded IP
    /.*\.local$/i,
    /.*\.internal$/i,
    /.*\.localhost$/i,
    /.*\.localdomain$/i,
    /^kubernetes\.default/i,
    /^host\.docker\.internal$/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(lowerHostname)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a webhook URL for SSRF protection
 *
 * @param url - The URL to validate
 * @returns Validation result with valid status and optional error message
 */
export function validateWebhookUrl(url: string): UrlValidationResult {
  // Check if URL is provided
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Check for empty string after trim
  if (trimmedUrl.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Parse the URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check for blocked protocols
  const protocol = parsedUrl.protocol.toLowerCase();
  if (BLOCKED_PROTOCOLS.includes(protocol)) {
    return { valid: false, error: `Protocol '${protocol.replace(':', '')}' is not allowed` };
  }

  // Only allow HTTP and HTTPS
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  // Require HTTPS in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && protocol !== 'https:') {
    return { valid: false, error: 'HTTPS is required for webhook URLs in production' };
  }

  // Get the hostname
  const hostname = parsedUrl.hostname.toLowerCase();

  // Check for empty hostname
  if (!hostname) {
    return { valid: false, error: 'URL must have a valid hostname' };
  }

  // Check for blocked hostnames
  if (isBlockedHostname(hostname)) {
    return { valid: false, error: 'Internal or private hostnames are not allowed' };
  }

  // Check for suspicious hostname patterns
  if (hasSuspiciousHostname(hostname)) {
    return { valid: false, error: 'Hostname pattern is not allowed for security reasons' };
  }

  // Check if hostname is an IP address and if it's in blocked ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (ipv4Regex.test(hostname)) {
    if (isBlockedIp(hostname)) {
      return { valid: false, error: 'Private or internal IP addresses are not allowed' };
    }
  }

  // Check for IPv6 addresses (enclosed in brackets in URL)
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const ipv6 = hostname.slice(1, -1);
    if (isBlockedIp(ipv6)) {
      return { valid: false, error: 'Private or internal IPv6 addresses are not allowed' };
    }
  }

  // Block URLs with authentication credentials embedded
  if (parsedUrl.username || parsedUrl.password) {
    return { valid: false, error: 'URLs with embedded credentials are not allowed' };
  }

  // Check for abnormal port numbers that might indicate internal services
  const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (protocol === 'https:' ? 443 : 80);
  const dangerousPorts = [22, 23, 25, 110, 143, 445, 1433, 1521, 3306, 5432, 6379, 11211, 27017];
  if (dangerousPorts.includes(port)) {
    return { valid: false, error: `Port ${port} is not allowed for webhook URLs` };
  }

  // Ensure URL length is reasonable (prevent DoS)
  if (trimmedUrl.length > 2048) {
    return { valid: false, error: 'URL exceeds maximum allowed length of 2048 characters' };
  }

  return { valid: true };
}

/**
 * Validates a URL and throws a BadRequestException if invalid
 * Useful for direct integration with NestJS controllers/services
 *
 * @param url - The URL to validate
 * @throws BadRequestException if URL is invalid
 */
export function assertValidWebhookUrl(url: string): void {
  const result = validateWebhookUrl(url);
  if (!result.valid) {
    // Import dynamically to avoid circular dependencies
    const { BadRequestException } = require('@nestjs/common');
    throw new BadRequestException(result.error);
  }
}
