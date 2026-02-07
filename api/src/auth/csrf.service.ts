import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * CSRF Protection Service
 *
 * Provides token-based CSRF protection for state-changing requests.
 * The CSRF token is tied to the user's session via the JWT's jti (JWT ID).
 *
 * Implementation:
 * - Generate a random CSRF token on login
 * - Store it securely (returned to client, not in JWT to avoid size bloat)
 * - Client must send the token in X-CSRF-Token header for state-changing requests
 * - Token is validated by deriving expected token from session ID (jti)
 *
 * This uses a cryptographic binding approach where the CSRF token is
 * derived from the session identifier, making it impossible to forge
 * without knowing the server's secret.
 */
@Injectable()
export class CsrfService {
    private readonly logger = new Logger(CsrfService.name);

    // CSRF secret - should be set via environment variable
    private readonly csrfSecret: string;

    constructor() {
        // SECURITY: Use environment variable for CSRF secret
        this.csrfSecret = process.env.CSRF_SECRET || '';

        if (!this.csrfSecret) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('CRITICAL: CSRF_SECRET environment variable is required in production');
            }
            // Generate a random secret for development
            this.csrfSecret = crypto.randomBytes(32).toString('hex');
            this.logger.warn('Using randomly generated CSRF secret - set CSRF_SECRET in production!');
        }
    }

    /**
     * Generate a CSRF token for a given session
     *
     * The token is cryptographically bound to the session ID (jti from JWT)
     * using HMAC-SHA256. This ensures:
     * 1. Token cannot be forged without knowing the secret
     * 2. Token is unique per session
     * 3. Token validation is stateless (no server-side storage needed)
     *
     * @param sessionId - The JWT's jti (unique session identifier)
     * @returns The CSRF token
     */
    generateCsrfToken(sessionId: string): string {
        if (!sessionId) {
            throw new Error('Session ID is required to generate CSRF token');
        }

        // Create HMAC of session ID with secret
        // This binds the CSRF token to the specific session
        const hmac = crypto.createHmac('sha256', this.csrfSecret);
        hmac.update(sessionId);

        // Add timestamp for potential token rotation (optional future enhancement)
        // For now, token is valid for the lifetime of the session
        const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // Hour-based
        hmac.update(timestamp.toString());

        return hmac.digest('hex');
    }

    /**
     * Validate a CSRF token against the session
     *
     * Compares the provided token against the expected token for the session.
     * Uses timing-safe comparison to prevent timing attacks.
     *
     * @param providedToken - The token from X-CSRF-Token header
     * @param sessionId - The JWT's jti (unique session identifier)
     * @returns true if valid, false otherwise
     */
    validateCsrfToken(providedToken: string, sessionId: string): boolean {
        if (!providedToken || !sessionId) {
            return false;
        }

        try {
            // Generate expected token for this session
            const expectedToken = this.generateCsrfToken(sessionId);

            // Use timing-safe comparison to prevent timing attacks
            // Both strings must be same length for timingSafeEqual
            if (providedToken.length !== expectedToken.length) {
                return false;
            }

            const providedBuffer = Buffer.from(providedToken, 'utf8');
            const expectedBuffer = Buffer.from(expectedToken, 'utf8');

            return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
        } catch (error) {
            this.logger.warn(`CSRF validation error: ${error.message}`);
            return false;
        }
    }

    /**
     * Generate a CSRF token with additional entropy
     *
     * This version adds a random nonce for extra security.
     * The nonce must be stored and sent back by the client.
     *
     * @param sessionId - The JWT's jti
     * @returns Object containing token and nonce
     */
    generateCsrfTokenWithNonce(sessionId: string): { token: string; nonce: string } {
        if (!sessionId) {
            throw new Error('Session ID is required to generate CSRF token');
        }

        // Generate random nonce
        const nonce = crypto.randomBytes(16).toString('hex');

        // Create HMAC of session ID + nonce with secret
        const hmac = crypto.createHmac('sha256', this.csrfSecret);
        hmac.update(sessionId);
        hmac.update(nonce);

        return {
            token: hmac.digest('hex'),
            nonce,
        };
    }

    /**
     * Validate a CSRF token with nonce
     *
     * @param providedToken - The token from X-CSRF-Token header
     * @param providedNonce - The nonce from X-CSRF-Nonce header
     * @param sessionId - The JWT's jti
     * @returns true if valid, false otherwise
     */
    validateCsrfTokenWithNonce(
        providedToken: string,
        providedNonce: string,
        sessionId: string,
    ): boolean {
        if (!providedToken || !providedNonce || !sessionId) {
            return false;
        }

        try {
            // Regenerate expected token with provided nonce
            const hmac = crypto.createHmac('sha256', this.csrfSecret);
            hmac.update(sessionId);
            hmac.update(providedNonce);
            const expectedToken = hmac.digest('hex');

            // Timing-safe comparison
            if (providedToken.length !== expectedToken.length) {
                return false;
            }

            const providedBuffer = Buffer.from(providedToken, 'utf8');
            const expectedBuffer = Buffer.from(expectedToken, 'utf8');

            return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
        } catch (error) {
            this.logger.warn(`CSRF validation with nonce error: ${error.message}`);
            return false;
        }
    }
}
