
import { Controller, Post, Body, UseGuards, Request, Get, Query, Res, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './strategies/local-auth.guard';
import { JwtAuthGuard } from './strategies/jwt-auth.guard';

// SECURITY: Auth-specific rate limits (stricter than global)
// These protect against brute force and credential stuffing attacks
const AUTH_RATE_LIMIT = { default: { ttl: 60000, limit: 5 } }; // 5 requests per minute
const SENSITIVE_RATE_LIMIT = { default: { ttl: 300000, limit: 3 } }; // 3 requests per 5 minutes

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private authService: AuthService) { }

    /**
     * Get OAuth provider status (public endpoint)
     * Returns which OAuth providers are enabled for the login page
     */
    @Get('oauth-status')
    async getOAuthStatus() {
        return this.authService.getOAuthStatus();
    }

    /**
     * Extract the origin URL from request headers for email branding
     */
    private getOrigin(req: any): string | undefined {
        return req.headers['origin'] || req.headers['referer'] || undefined;
    }

    /**
     * Extract the real client IP address from request headers
     * Handles X-Forwarded-For header which may contain multiple IPs
     */
    private getClientIp(req: any): string {
        // X-Forwarded-For can be comma-separated: "client, proxy1, proxy2"
        const forwardedFor = req.headers['x-forwarded-for'];
        if (forwardedFor) {
            const ips = String(forwardedFor).split(',').map(ip => ip.trim());
            // First IP is the original client
            if (ips[0] && !ips[0].startsWith('127.') && !ips[0].startsWith('::')) {
                return ips[0];
            }
        }

        // Check X-Real-IP header (used by some proxies)
        const realIp = req.headers['x-real-ip'];
        if (realIp && !String(realIp).startsWith('127.') && !String(realIp).startsWith('::')) {
            return String(realIp);
        }

        // Fall back to req.ip, cleaning up IPv6-mapped IPv4 addresses
        const ip = req.ip || 'unknown';
        // Convert ::ffff:127.0.0.1 to 127.0.0.1
        if (ip.startsWith('::ffff:')) {
            return ip.substring(7);
        }
        return ip;
    }

    @Throttle(AUTH_RATE_LIMIT) // SECURITY: Strict rate limit for login
    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req, @Body() loginDto: LoginDto) {
        const ipAddress = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        return this.authService.login(req.user, ipAddress, userAgent);
    }

    @Throttle(AUTH_RATE_LIMIT) // SECURITY: Strict rate limit for registration
    @Post('register')
    async register(@Request() req, @Body() registerDto: RegisterDto) {
        // Pass origin for email branding
        registerDto.origin = this.getOrigin(req);
        return this.authService.register(registerDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }

    /**
     * Refresh access token
     * POST /auth/refresh
     * Requires: Bearer token in Authorization header
     * Returns a new JWT token with fresh expiry
     */
    @UseGuards(JwtAuthGuard)
    @Post('refresh')
    async refresh(@Request() req) {
        return this.authService.refreshToken({
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role,
            organizationId: req.user.organizationId,
            jti: req.user.jti,
        });
    }

    /**
     * Verify email address
     * GET /auth/verify-email?token=<token>
     * Public endpoint - no auth required
     */
    @Get('verify-email')
    async verifyEmail(@Query('token') token: string) {
        if (!token) {
            return { success: false, error: 'Verification token is required' };
        }
        return this.authService.verifyEmail(token);
    }

    /**
     * Get current user - alias for /profile (mobile app uses this endpoint)
     */
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req) {
        return this.authService.getUserProfile(req.user.userId);
    }

    /**
     * Update user profile
     */
    @UseGuards(JwtAuthGuard)
    @Post('update-profile')
    async updateProfile(
        @Request() req,
        @Body() updateProfileDto: { name?: string; avatarUrl?: string },
    ) {
        return this.authService.updateProfile(req.user.userId, updateProfileDto);
    }

    /**
     * Change password
     */
    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    async changePassword(
        @Request() req,
        @Body() changePasswordDto: { currentPassword: string; newPassword: string },
    ) {
        return this.authService.changePassword(
            req.user.userId,
            changePasswordDto.currentPassword,
            changePasswordDto.newPassword,
        );
    }

    /**
     * Request password reset
     * Sends a reset code to the user's email
     */
    @Throttle(SENSITIVE_RATE_LIMIT) // SECURITY: Very strict limit to prevent enumeration
    @Post('forgot-password')
    async forgotPassword(
        @Request() req,
        @Body() forgotPasswordDto: { email: string },
    ) {
        const ipAddress = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        const origin = this.getOrigin(req);
        return this.authService.requestPasswordReset(
            forgotPasswordDto.email,
            ipAddress,
            userAgent,
            origin,
        );
    }

    /**
     * Verify reset code
     * Returns a token if the code is valid
     */
    @Throttle(AUTH_RATE_LIMIT) // SECURITY: Rate limit code verification attempts
    @Post('verify-reset-code')
    async verifyResetCode(
        @Body() verifyCodeDto: { email: string; code: string },
    ) {
        return this.authService.verifyResetCode(
            verifyCodeDto.email,
            verifyCodeDto.code,
        );
    }

    /**
     * Reset password using token
     * Completes the password reset process
     */
    @Post('reset-password')
    async resetPassword(
        @Request() req,
        @Body() resetPasswordDto: { token: string; newPassword: string },
    ) {
        const ipAddress = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        const origin = this.getOrigin(req);
        return this.authService.resetPassword(
            resetPasswordDto.token,
            resetPasswordDto.newPassword,
            ipAddress,
            userAgent,
            origin,
        );
    }

    /**
     * Accept partner portal invitation
     * Sets password and activates partner user account
     */
    @Post('accept-partner-invite')
    async acceptPartnerInvite(
        @Request() req,
        @Body() dto: { token: string; password: string; name?: string },
    ) {
        const ipAddress = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        return this.authService.acceptPartnerInvite(dto.token, dto.password, dto.name, ipAddress, userAgent);
    }

    /**
     * Request magic link login
     * Sends a magic link email for passwordless login
     */
    @Throttle(SENSITIVE_RATE_LIMIT) // SECURITY: Very strict limit to prevent enumeration
    @Post('magic-link')
    async requestMagicLink(
        @Request() req,
        @Body() magicLinkDto: { email: string },
    ) {
        const ipAddress = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        const origin = this.getOrigin(req);
        return this.authService.requestMagicLink(
            magicLinkDto.email,
            ipAddress,
            userAgent,
            origin,
        );
    }

    /**
     * Verify magic link and log user in
     * Returns JWT token if the magic link is valid
     */
    @Get('magic-link')
    async verifyMagicLink(
        @Request() req,
        @Query('token') token: string,
    ) {
        if (!token) {
            return { success: false, error: 'Token is required' };
        }
        const ipAddress = this.getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        return this.authService.verifyMagicLink(token, ipAddress, userAgent);
    }

    /**
     * Logout - revoke the current token
     * POST /auth/logout
     * Requires: Bearer token in Authorization header
     */
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(@Request() req) {
        // Extract JWT claims from the request
        // The JwtStrategy validates the token and puts decoded payload in req.user
        const jti = req.user?.jti;
        const userId = req.user?.userId;

        if (!jti) {
            // Token doesn't have jti - might be an old token before this feature
            this.logger.warn(`Logout attempted with token missing jti for user ${userId}`);
            return { success: true, message: 'Logged out (token did not support revocation)' };
        }

        // Calculate expiration from token (default 1 hour from issue)
        // In production, you'd decode the token to get exact exp
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        return this.authService.logout(jti, userId, expiresAt);
    }

    /**
     * Logout from all sessions
     * POST /auth/logout-all
     * Requires: Bearer token in Authorization header
     * Revokes all active tokens for the user across all devices
     */
    @UseGuards(JwtAuthGuard)
    @Post('logout-all')
    async logoutAll(@Request() req) {
        const userId = req.user?.userId;

        if (!userId) {
            return { success: false, message: 'User not found' };
        }

        return this.authService.logoutAllSessions(userId);
    }

    /**
     * Get active session count
     * GET /auth/sessions/count
     * Returns the number of active sessions for the current user
     */
    @UseGuards(JwtAuthGuard)
    @Get('sessions/count')
    async getSessionCount(@Request() req) {
        const userId = req.user?.userId;
        const count = await this.authService.getActiveSessionCount(userId);
        return { activeSessionCount: count };
    }

    /**
     * Get/Refresh CSRF token
     * GET /auth/csrf-token
     * Requires: Bearer token in Authorization header
     *
     * Returns a new CSRF token for the current session.
     * The client should call this endpoint when:
     * - They need a fresh CSRF token
     * - The CSRF token has expired (hour-based rotation)
     *
     * The returned token must be sent in the X-CSRF-Token header
     * for all state-changing requests (POST, PUT, PATCH, DELETE).
     */
    @UseGuards(JwtAuthGuard)
    @Get('csrf-token')
    async getCsrfToken(@Request() req) {
        const jti = req.user?.jti;

        if (!jti) {
            // Token doesn't have jti - might be an old token before this feature
            this.logger.warn(`CSRF token requested with token missing jti for user ${req.user?.userId}`);
            return {
                success: false,
                error: 'Session does not support CSRF tokens. Please log in again.',
            };
        }

        const csrfToken = this.authService.generateCsrfTokenForSession(jti);

        return {
            success: true,
            csrf_token: csrfToken,
        };
    }

    /**
     * Zoom OAuth Callback
     * GET /auth/zoom/callback
     *
     * This endpoint receives the OAuth authorization code from Zoom
     * after a user authorizes the app.
     */
    @Get('zoom/callback')
    async zoomOAuthCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ) {
        this.logger.log(`Zoom OAuth callback received - code: ${code ? 'present' : 'missing'}, state: ${state}`);

        if (!code) {
            return res.status(400).json({ error: 'Authorization code missing' });
        }

        try {
            // For now, just acknowledge the callback
            // In production, you would exchange the code for tokens
            this.logger.log('Zoom OAuth authorization successful');

            // Redirect to frontend or return success
            return res.json({
                success: true,
                message: 'Zoom authorization successful',
                code: code.substring(0, 10) + '...',
            });
        } catch (error) {
            this.logger.error(`Zoom OAuth error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    }
}
