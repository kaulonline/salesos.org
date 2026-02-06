import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
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
} from '../security';

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock });

// Mock crypto.getRandomValues
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  },
});

describe('security utilities', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.clearAllMocks();
    clearCsrfToken();
    cleanupRateLimits();
  });

  describe('sanitizeHtml', () => {
    it('should return empty string for falsy input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as unknown as string)).toBe('');
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    });

    it('should allow safe HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      expect(sanitizeHtml(html)).toBe('<p>Hello <strong>world</strong></p>');
    });

    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const html = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onerror');
    });

    it('should remove iframe tags', () => {
      const html = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<iframe');
    });

    it('should add rel="noopener noreferrer" to links', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should be stricter in strict mode', () => {
      const html = '<table><tr><td>Data</td></tr></table>';
      const result = sanitizeHtml(html, true);
      expect(result).not.toContain('<table>');
    });
  });

  describe('escapeHtml', () => {
    it('should return empty string for falsy input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('a & b')).toBe('a &amp; b');
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHtml("'single'")).toBe('&#x27;single&#x27;');
    });

    it('should escape forward slash', () => {
      expect(escapeHtml('</script>')).toBe('&lt;&#x2F;script&gt;');
    });

    it('should handle mixed content', () => {
      const input = '<div class="test">Hello & "world"</div>';
      const expected = '&lt;div class&#x3D;&quot;test&quot;&gt;Hello &amp; &quot;world&quot;&lt;&#x2F;div&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return empty string for falsy input', () => {
      expect(sanitizeUrl('')).toBe('');
    });

    it('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
      expect(sanitizeUrl('//example.com')).toBe('//example.com');
    });

    it('should allow mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should allow tel URLs', () => {
      expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
    });

    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
      expect(sanitizeUrl('  javascript:alert(1)')).toBe('');
    });

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should block vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBe('');
    });

    it('should block file: URLs', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('should block unknown protocols', () => {
      expect(sanitizeUrl('custom:something')).toBe('');
    });
  });

  describe('CSRF Token Management', () => {
    describe('setCsrfToken', () => {
      it('should store token in memory and sessionStorage', () => {
        setCsrfToken('test-csrf-token');
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'csrf_token',
          'test-csrf-token'
        );
      });
    });

    describe('getCsrfToken', () => {
      it('should return null when no token is set', () => {
        expect(getCsrfToken()).toBeNull();
      });

      it('should return the stored token', () => {
        setCsrfToken('my-token');
        expect(getCsrfToken()).toBe('my-token');
      });

      it('should restore token from sessionStorage', () => {
        sessionStorageMock.setItem('csrf_token', 'stored-token');
        // Clear memory state
        clearCsrfToken();
        // Should restore from sessionStorage
        sessionStorageMock.getItem.mockReturnValueOnce('stored-token');
        expect(getCsrfToken()).toBe('stored-token');
      });
    });

    describe('clearCsrfToken', () => {
      it('should clear token from memory and sessionStorage', () => {
        setCsrfToken('token-to-clear');
        clearCsrfToken();
        expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('csrf_token');
      });
    });

    describe('generateCsrfToken', () => {
      it('should generate a 64-character hex string', () => {
        const token = generateCsrfToken();
        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[0-9a-f]+$/);
      });

      it('should generate unique tokens', () => {
        const token1 = generateCsrfToken();
        const token2 = generateCsrfToken();
        expect(token1).not.toBe(token2);
      });
    });
  });

  describe('containsInjectionPatterns', () => {
    it('should return false for empty input', () => {
      expect(containsInjectionPatterns('')).toBe(false);
    });

    it('should return false for normal text', () => {
      expect(containsInjectionPatterns('Hello, world!')).toBe(false);
      expect(containsInjectionPatterns('user@example.com')).toBe(false);
    });

    it('should detect script tags', () => {
      expect(containsInjectionPatterns('<script>alert(1)</script>')).toBe(true);
      expect(containsInjectionPatterns('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(containsInjectionPatterns('javascript:alert(1)')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(containsInjectionPatterns('onclick=alert(1)')).toBe(true);
      expect(containsInjectionPatterns('onerror=alert(1)')).toBe(true);
      expect(containsInjectionPatterns('onmouseover = alert(1)')).toBe(true);
    });

    it('should detect iframe tags', () => {
      expect(containsInjectionPatterns('<iframe src="evil.com">')).toBe(true);
    });

    it('should detect object and embed tags', () => {
      expect(containsInjectionPatterns('<object data="evil.swf">')).toBe(true);
      expect(containsInjectionPatterns('<embed src="evil.swf">')).toBe(true);
    });

    it('should detect CSS expression attacks', () => {
      expect(containsInjectionPatterns('expression(alert(1))')).toBe(true);
    });

    it('should detect data:text/html', () => {
      expect(containsInjectionPatterns('data: text/html,<script>alert(1)</script>')).toBe(
        true
      );
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit('test-action', 5, 60000);
      expect(result.allowed).toBe(true);
    });

    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit('test-action-2', 5, 60000);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block requests over limit', () => {
      // Make 5 allowed requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-action-3', 5, 60000);
      }

      // 6th request should be blocked
      const result = checkRateLimit('test-action-3', 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should use different limits for different keys', () => {
      // Max out key-a
      for (let i = 0; i < 3; i++) {
        checkRateLimit('key-a', 3, 60000);
      }

      // key-b should still be allowed
      const result = checkRateLimit('key-b', 3, 60000);
      expect(result.allowed).toBe(true);
    });
  });

  describe('cleanupRateLimits', () => {
    it('should not throw when called', () => {
      expect(() => cleanupRateLimits()).not.toThrow();
    });
  });
});
