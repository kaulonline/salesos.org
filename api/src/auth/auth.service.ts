import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLogService, LogCategory, TransactionStatus } from '../admin/application-log.service';
import { SystemSettingsService } from '../admin/system-settings.service';
import { PremiumEmailService } from '../email/premium-email.service';
import { SalesOSEmailService } from '../email/salesos-email.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { CsrfService } from './csrf.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly appUrl: string;
    private readonly ipdataApiKey: string;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private applicationLogService: ApplicationLogService,
        private systemSettingsService: SystemSettingsService,
        private premiumEmailService: PremiumEmailService,
        private salesOSEmailService: SalesOSEmailService,
        private configService: ConfigService,
        private organizationsService: OrganizationsService,
        private tokenBlacklistService: TokenBlacklistService,
        private csrfService: CsrfService,
    ) {
        this.appUrl = this.configService.get<string>('APP_URL') || 'https://engage.iriseller.com';
        // SECURITY: No hardcoded API key fallback - require env variable
        this.ipdataApiKey = this.configService.get<string>('IPDATA_API_KEY') || '';
        if (!this.ipdataApiKey && process.env.NODE_ENV === 'production') {
            this.logger.warn('IPDATA_API_KEY not configured - geo-IP lookups will be disabled');
        }
    }

    /**
     * Check if request originates from SalesOS (salesos.org)
     */
    private isSalesOSOrigin(origin?: string): boolean {
        if (!origin) return false;
        return origin.includes('salesos.org') || origin.includes('salesos.com');
    }

    /**
     * Check if a user has email notifications enabled
     */
    private async isUserEmailEnabled(userId: string): Promise<boolean> {
        try {
            const prefs = await this.prisma.emailNotificationPreferences.findUnique({
                where: { userId },
                select: { emailsEnabled: true },
            });
            // If no preferences exist, default to enabled
            return prefs?.emailsEnabled ?? true;
        } catch (error) {
            this.logger.warn(`Failed to check email preferences for user ${userId}: ${error.message}`);
            return true; // Default to enabled on error
        }
    }

    /**
     * Look up geographic location from IP address using ipdata.co
     */
    private async getLocationFromIp(ipAddress: string): Promise<string> {
        try {
            // Skip lookup if API key not configured
            if (!this.ipdataApiKey) {
                return 'Unknown';
            }

            // Skip lookup for local/private IPs
            if (!ipAddress ||
                ipAddress === 'unknown' ||
                ipAddress.startsWith('127.') ||
                ipAddress.startsWith('192.168.') ||
                ipAddress.startsWith('10.') ||
                ipAddress.startsWith('172.') ||
                ipAddress === 'localhost' ||
                ipAddress.startsWith('::')) {
                return 'Local Network';
            }

            const response = await fetch(
                `https://api.ipdata.co/${ipAddress}?api-key=${this.ipdataApiKey}`,
                {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(5000), // 5 second timeout
                }
            );

            if (!response.ok) {
                this.logger.warn(`IP geolocation lookup failed for ${ipAddress}: ${response.status}`);
                return 'Unknown';
            }

            const data = await response.json();

            // Build location string: "City, Region, Country"
            const parts: string[] = [];
            if (data.city) parts.push(data.city);
            if (data.region) parts.push(data.region);
            if (data.country_name) parts.push(data.country_name);

            if (parts.length === 0) {
                return 'Unknown';
            }

            return parts.join(', ');
        } catch (error) {
            this.logger.warn(`IP geolocation lookup error for ${ipAddress}: ${error.message}`);
            return 'Unknown';
        }
    }

    /**
     * Get OAuth provider status (public)
     * Returns which OAuth providers are enabled based on database configuration
     */
    async getOAuthStatus(): Promise<{
        google: { enabled: boolean; configured: boolean };
        apple: { enabled: boolean; configured: boolean };
    }> {
        try {
            // Get OAuth configuration from database
            const googleEnabled = await this.systemSettingsService.get<boolean>('oauth_google_enabled', false);
            const googleClientId = await this.systemSettingsService.get<string>('oauth_google_client_id', '');
            const googleClientSecret = await this.systemSettingsService.get<string>('oauth_google_client_secret', '');

            const appleEnabled = await this.systemSettingsService.get<boolean>('oauth_apple_enabled', false);
            const appleClientId = await this.systemSettingsService.get<string>('oauth_apple_client_id', '');
            const appleTeamId = await this.systemSettingsService.get<string>('oauth_apple_team_id', '');
            const appleKeyId = await this.systemSettingsService.get<string>('oauth_apple_key_id', '');
            const applePrivateKey = await this.systemSettingsService.get<string>('oauth_apple_private_key', '');

            // Check if providers are properly configured (have required credentials)
            const googleConfigured = !!(googleClientId && googleClientSecret);
            const appleConfigured = !!(appleClientId && appleTeamId && appleKeyId && applePrivateKey);

            return {
                google: {
                    enabled: googleEnabled && googleConfigured,
                    configured: googleConfigured,
                },
                apple: {
                    enabled: appleEnabled && appleConfigured,
                    configured: appleConfigured,
                },
            };
        } catch (error) {
            this.logger.warn(`Failed to get OAuth status: ${error.message}`);
            // Return disabled on error
            return {
                google: { enabled: false, configured: false },
                apple: { enabled: false, configured: false },
            };
        }
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && user.passwordHash) {
            const isMatch = await bcrypt.compare(pass, user.passwordHash);
            if (isMatch) {
                // Log successful authentication
                await this.applicationLogService.info('AuthService.validateUser', `User authenticated: ${email}`, {
                    category: LogCategory.AUTH,
                    userId: user.id,
                    entityType: 'User',
                    entityId: user.id,
                    tags: ['login', 'auth-success'],
                });
                
                // Update last login time
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() },
                });
                
                const { passwordHash, ...result } = user;
                return result;
            }
        }
        
        // Log failed authentication attempt (without PII for security)
        await this.applicationLogService.warn('AuthService.validateUser', 'Failed login attempt', {
            category: LogCategory.AUTH,
            // SECURITY: Don't log email addresses to prevent enumeration via logs
            metadata: { emailHash: this.hashEmailForLogging(email) },
            tags: ['login', 'auth-failed'],
        });
        
        return null;
    }

    async login(user: any, ipAddress?: string, userAgent?: string) {
        // First fetch organization to include in JWT payload
        let primaryOrganizationId: string | undefined;
        const membership = await this.prisma.organizationMember.findFirst({
            where: { userId: user.id, isActive: true },
            include: {
                organization: {
                    select: { id: true, status: true, name: true }
                }
            }
        });
        if (membership?.organization?.status === 'ACTIVE') {
            primaryOrganizationId = membership.organization.id;
        }

        // Generate unique JWT ID for token revocation support
        const jti = crypto.randomUUID();

        // Calculate token expiration (1 hour from now, matching JWT_SECRET config)
        const expiresIn = 60 * 60; // 1 hour in seconds
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        // Include organizationId in JWT payload for tenant-scoped requests
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            organizationId: primaryOrganizationId, // Multi-tenant: user's primary organization
            jti, // JWT ID for token revocation
        };

        // Track this session for "logout all" functionality
        this.tokenBlacklistService.trackSession(user.id, jti, expiresAt).catch(err => {
            this.logger.warn(`Failed to track session: ${err.message}`);
        });

        // Log login transaction
        await this.applicationLogService.logTransaction(
            'AuthService.login',
            'USER_LOGIN',
            TransactionStatus.SUCCESS,
            `User logged in: ${user.email}`,
            {
                category: LogCategory.AUTH,
                userId: user.id,
                entityType: 'User',
                entityId: user.id,
                metadata: { ipAddress, userAgent: userAgent?.substring(0, 200) },
                tags: ['login', 'session-start'],
            }
        );

        // Send login notification email (non-blocking, respects admin settings AND user preferences)
        // Use an async IIFE to handle the geo-IP lookup without blocking the response
        (async () => {
            try {
                // Check if login notifications are enabled (admin setting)
                const isEnabled = await this.systemSettingsService.isLoginNotificationsEnabled();
                if (!isEnabled) {
                    this.logger.log(`Login notification disabled for ${user.email} (admin setting)`);
                    return;
                }

                // Check if user has email notifications enabled (user preference)
                const userEmailEnabled = await this.isUserEmailEnabled(user.id);
                if (!userEmailEnabled) {
                    this.logger.log(`Login notification disabled for ${user.email} (user preference)`);
                    return;
                }

                const { device, browser } = this.parseUserAgent(userAgent || '');
                const loginTime = new Date().toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                });

                // Look up location from IP (with timeout) - check if geo-IP is enabled
                const geoIpEnabled = await this.systemSettingsService.isGeoIpLookupEnabled();
                const location = geoIpEnabled
                    ? await this.getLocationFromIp(ipAddress || '')
                    : 'Unknown';

                // Check if user is a partner user to link to correct security page
                let isPortalUser = false;
                try {
                    const portalUser = await this.prisma.partnerUser.findFirst({
                        where: {
                            userId: user.id,
                            isActive: true,
                            partner: {
                                portalEnabled: true,
                                status: 'APPROVED',
                            },
                        },
                        select: { id: true },
                    });
                    isPortalUser = !!portalUser;
                    this.logger.log(`Portal user check for ${user.email}: isPortalUser=${isPortalUser}, found=${!!portalUser}`);
                } catch (e) {
                    this.logger.warn(`Partner check error for ${user.email}: ${e.message}`);
                }

                await this.salesOSEmailService.sendLoginNotificationEmail({
                    to: user.email,
                    userName: user.name || 'there',
                    loginTime,
                    ipAddress: ipAddress || 'Unknown',
                    location,
                    device,
                    browser,
                    isPortalUser,
                });
            } catch (err) {
                this.logger.warn(`Failed to send login notification to ${user.email}: ${err.message}`);
            }
        })();

        // Fetch organization membership if exists
        let organizationData: {
            organizationId?: string;
            organizationName?: string;
            organizationRole?: string;
            organizationSlug?: string;
            membershipActive?: boolean;
        } = {};
        let licenseData: {
            hasLicense?: boolean;
            licenseStatus?: string;
            licenseTier?: string;
            licenseExpiry?: string;
        } = {};
        let partnerData: {
            isPartnerUser?: boolean;
            partnerId?: string;
            partnerRole?: string;
        } = {};

        try {
            const membership = await this.prisma.organizationMember.findFirst({
                where: { userId: user.id },
                include: {
                    organization: {
                        select: { id: true, name: true, slug: true, status: true }
                    }
                }
            });
            if (membership) {
                const isOrgActive = membership.organization?.status === 'ACTIVE';
                organizationData = {
                    organizationId: membership.organization.id,
                    organizationName: membership.organization.name,
                    organizationSlug: membership.organization.slug,
                    organizationRole: membership.role,
                    membershipActive: membership.isActive && isOrgActive,
                };

                // Fetch user license status for organization members
                const userLicense = await this.prisma.userLicense.findFirst({
                    where: {
                        userId: user.id,
                        organizationId: membership.organization.id,
                    },
                    include: {
                        licenseType: {
                            select: { tier: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                if (userLicense) {
                    licenseData = {
                        hasLicense: true,
                        licenseStatus: userLicense.status,
                        licenseTier: userLicense.licenseType?.tier,
                        licenseExpiry: userLicense.endDate?.toISOString(),
                    };
                } else {
                    licenseData = {
                        hasLicense: false,
                        licenseStatus: 'NONE',
                    };
                }
            }
        } catch (e) {
            // Non-critical, ignore organization lookup errors
            this.logger.warn(`Failed to fetch org/license info for user ${user.id}: ${e.message}`);
        }

        // Check if user is a partner user (for Partner Portal access)
        try {
            const partnerUser = await this.prisma.partnerUser.findFirst({
                where: {
                    userId: user.id,
                    isActive: true,
                    partner: {
                        portalEnabled: true,
                        status: 'APPROVED',
                    },
                },
                select: {
                    partnerId: true,
                    role: true,
                },
            });

            if (partnerUser) {
                partnerData = {
                    isPartnerUser: true,
                    partnerId: partnerUser.partnerId,
                    partnerRole: partnerUser.role,
                };
                this.logger.log(`User ${user.email} is a partner user (partner: ${partnerUser.partnerId})`);
            }
        } catch (e) {
            // Non-critical, ignore partner lookup errors
            this.logger.warn(`Failed to fetch partner info for user ${user.id}: ${e.message}`);
        }

        // Generate CSRF token bound to this session
        const csrfToken = this.csrfService.generateCsrfToken(jti);

        return {
            access_token: this.jwtService.sign(payload),
            csrf_token: csrfToken, // CSRF token for state-changing requests
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                role: user.role,
                ...organizationData,
                ...licenseData,
                ...partnerData,
            },
        };
    }

    /**
     * Generate a new CSRF token for the current session
     * Called via GET /auth/csrf-token to refresh the token
     */
    generateCsrfTokenForSession(sessionId: string): string {
        return this.csrfService.generateCsrfToken(sessionId);
    }

    /**
     * Parse user agent to extract device and browser info
     */
    private parseUserAgent(userAgent: string): { device: string; browser: string } {
        let device = 'Unknown device';
        let browser = 'Unknown browser';

        if (!userAgent) return { device, browser };

        // Detect browser
        if (userAgent.includes('Firefox/')) {
            browser = 'Firefox';
        } else if (userAgent.includes('Edg/')) {
            browser = 'Microsoft Edge';
        } else if (userAgent.includes('Chrome/')) {
            browser = 'Google Chrome';
        } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
            browser = 'Safari';
        } else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
            browser = 'Opera';
        }

        // Detect device/OS
        if (userAgent.includes('iPhone')) {
            device = 'iPhone';
        } else if (userAgent.includes('iPad')) {
            device = 'iPad';
        } else if (userAgent.includes('Android')) {
            device = userAgent.includes('Mobile') ? 'Android Phone' : 'Android Tablet';
        } else if (userAgent.includes('Windows')) {
            device = 'Windows PC';
        } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
            device = 'Mac';
        } else if (userAgent.includes('Linux')) {
            device = 'Linux';
        }

        return { device, browser };
    }

    /**
     * Hash email for logging purposes (privacy protection)
     * Only first 3 chars + domain visible for debugging
     */
    private hashEmailForLogging(email: string): string {
        if (!email || !email.includes('@')) return 'invalid';
        const [local, domain] = email.split('@');
        const masked = local.substring(0, 3) + '***';
        return `${masked}@${domain}`;
    }

    async register(registerDto: RegisterDto) {
        // ===== ENTERPRISE B2B: Validate organization code if provided =====
        let organizationValidation: {
            valid: boolean;
            reason?: string;
            organization?: { id: string; name: string; slug: string };
            defaultRole?: any;
            autoAssignLicenseId?: string;
        } | null = null;

        if (registerDto.organizationCode) {
            organizationValidation = await this.organizationsService.validateOrganizationCode(
                registerDto.organizationCode,
            );

            if (!organizationValidation.valid) {
                await this.applicationLogService.warn('AuthService.register',
                    `Invalid organization code: ${registerDto.organizationCode} - ${organizationValidation.reason}`, {
                    category: LogCategory.AUTH,
                    tags: ['registration', 'invalid-org-code'],
                });
                throw new BadRequestException(
                    `Invalid organization code: ${organizationValidation.reason}`,
                );
            }

            this.logger.log(
                `Organization code validated for ${registerDto.email}: ${organizationValidation.organization?.name}`,
            );
        }

        // Check for existing user
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            await this.applicationLogService.warn('AuthService.register', `Registration attempt with existing email: ${registerDto.email}`, {
                category: LogCategory.AUTH,
                tags: ['registration', 'duplicate-email'],
            });
            throw new UnauthorizedException('User already exists');
        }

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(registerDto.password, salt);

        // Support both "name" (web) and "firstName/lastName" (mobile) formats
        const fullName = registerDto.name ||
            [registerDto.firstName, registerDto.lastName].filter(Boolean).join(' ') ||
            'User';

        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                passwordHash,
                name: fullName,
            },
        });

        // ===== ENTERPRISE B2B: Add user to organization if code was provided =====
        if (organizationValidation?.valid && organizationValidation.organization) {
            try {
                // Add user as organization member
                await this.organizationsService.addOrganizationMember(
                    organizationValidation.organization.id,
                    {
                        userId: user.id,
                        role: organizationValidation.defaultRole,
                    },
                    undefined, // invitedBy (self-registration)
                    registerDto.organizationCode, // registrationCode for audit
                );

                // Increment the organization code usage
                if (registerDto.organizationCode) {
                    await this.organizationsService.useOrganizationCode(registerDto.organizationCode);
                }

                this.logger.log(
                    `User ${user.email} added to organization ${organizationValidation.organization.name}`,
                );

                // ===== AUTO-ASSIGN LICENSE FROM ORG POOL IF CONFIGURED =====
                if (organizationValidation.autoAssignLicenseId) {
                    try {
                        // Find an active organization license of the specified type
                        const orgLicenses = await this.prisma.organizationLicense.findMany({
                            where: {
                                organizationId: organizationValidation.organization.id,
                                licenseTypeId: organizationValidation.autoAssignLicenseId,
                                status: 'ACTIVE',
                            },
                            orderBy: { createdAt: 'desc' },
                        });

                        // Find one with available seats
                        const availableLicense = orgLicenses.find(
                            lic => lic.usedSeats < lic.totalSeats,
                        );

                        if (availableLicense) {
                            await this.organizationsService.allocateLicenseSeat(
                                availableLicense.id,
                                user.id,
                            );
                            this.logger.log(
                                `Auto-assigned license to user ${user.email} from org pool`,
                            );
                        } else {
                            this.logger.warn(
                                `No available seats in org license pool for user ${user.email}`,
                            );
                        }
                    } catch (licenseError) {
                        // Don't fail registration if license assignment fails
                        this.logger.warn(
                            `Failed to auto-assign license for ${user.email}: ${licenseError.message}`,
                        );
                    }
                }
            } catch (orgError) {
                // Log but don't fail registration - user is created, just not in org
                this.logger.error(
                    `Failed to add user ${user.email} to organization: ${orgError.message}`,
                );
            }
        } else {
            // ===== AUTO-CREATE PERSONAL ORGANIZATION =====
            // Users without an org code get their own personal organization
            // This ensures all users have organization context for multi-tenant isolation
            try {
                const personalOrgName = `${fullName}'s Workspace`;
                const personalOrgSlug = `personal-${user.id.slice(-8)}`;

                const personalOrg = await this.prisma.organization.create({
                    data: {
                        name: personalOrgName,
                        slug: personalOrgSlug,
                        contactEmail: user.email,
                        status: 'ACTIVE',
                    },
                });

                // Add user as OWNER of their personal organization
                await this.prisma.organizationMember.create({
                    data: {
                        userId: user.id,
                        organizationId: personalOrg.id,
                        role: 'OWNER',
                        isActive: true,
                    },
                });

                this.logger.log(
                    `Created personal organization for user ${user.email}: ${personalOrg.name}`,
                );
            } catch (personalOrgError) {
                // Log but don't fail registration
                this.logger.error(
                    `Failed to create personal organization for ${user.email}: ${personalOrgError.message}`,
                );
            }
        }

        // Log successful registration
        await this.applicationLogService.logTransaction(
            'AuthService.register',
            'USER_REGISTER',
            TransactionStatus.SUCCESS,
            `New user registered: ${registerDto.email}${organizationValidation?.organization ? ` (org: ${organizationValidation.organization.name})` : ''}`,
            {
                category: LogCategory.AUTH,
                userId: user.id,
                entityType: 'User',
                entityId: user.id,
                tags: organizationValidation?.organization
                    ? ['registration', 'new-user', 'enterprise', 'organization']
                    : ['registration', 'new-user', 'personal-org'],
            }
        );

        // Send welcome email (non-blocking) - use SalesOS or IRIS branding based on origin
        const sendWelcome = this.isSalesOSOrigin(registerDto.origin)
            ? this.salesOSEmailService.sendWelcomeEmail({
                to: user.email,
                userName: user.name || undefined,
            })
            : this.premiumEmailService.sendWelcomeEmail(user.email, {
                userName: user.name || 'there',
                userEmail: user.email,
                loginUrl: `${this.appUrl}/login`,
            });
        sendWelcome.catch(err => {
            this.logger.warn(`Failed to send welcome email to ${user.email}: ${err.message}`);
        });

        const { passwordHash: _, ...result } = user;
        return this.login(result);
    }

    /**
     * Get user profile by ID
     */
    async getUserProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
                organizationMemberships: {
                    where: { isActive: true },
                    select: {
                        organizationId: true,
                        role: true,
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: { joinedAt: 'asc' },
                    take: 1, // Get primary (first) organization
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Extract primary organization ID for multi-tenant context
        const primaryMembership = user.organizationMemberships[0];
        const organizationId = primaryMembership?.organization?.status === 'ACTIVE'
            ? primaryMembership.organizationId
            : undefined;

        // Return user with organizationId for frontend context
        const { organizationMemberships, ...userWithoutMemberships } = user;
        return {
            ...userWithoutMemberships,
            organizationId,
            organizationName: primaryMembership?.organization?.name,
            organizationRole: primaryMembership?.role,
        };
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                avatarUrl: data.avatarUrl,
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        await this.applicationLogService.info('AuthService.updateProfile', `Profile updated for user: ${user.email}`, {
            category: LogCategory.AUTH,
            userId: user.id,
            entityType: 'User',
            entityId: user.id,
            tags: ['profile', 'update'],
        });

        return user;
    }

    /**
     * Change user password
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('User not found');
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            await this.applicationLogService.warn('AuthService.changePassword', `Invalid current password for user: ${user.email}`, {
                category: LogCategory.AUTH,
                userId: user.id,
                tags: ['password', 'change-failed'],
            });
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Hash new password
        const salt = await bcrypt.genSalt();
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });

        await this.applicationLogService.logTransaction(
            'AuthService.changePassword',
            'PASSWORD_CHANGE',
            TransactionStatus.SUCCESS,
            `Password changed for user: ${user.email}`,
            {
                category: LogCategory.AUTH,
                userId: user.id,
                entityType: 'User',
                entityId: user.id,
                tags: ['password', 'change-success'],
            }
        );

        return { success: true, message: 'Password changed successfully' };
    }

    /**
     * Hash a token using SHA256 for secure storage
     * Used for password reset tokens to prevent exposure if database is compromised
     */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Request password reset - generates code and sends email
     */
    async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string, origin?: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            this.logger.warn(`Password reset requested for non-existent email: ${email}`);
            return { success: true, message: 'If an account exists with this email, a reset code has been sent.' };
        }

        // Generate 6-digit reset code
        const resetCode = this.premiumEmailService.generateVerificationCode(6);
        const resetToken = this.premiumEmailService.generateResetToken(32);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // Hash the token before storing (security: prevent token exposure if DB is compromised)
        const hashedToken = this.hashToken(resetToken);

        // Store hashed reset token in database (using settings field)
        const currentSettings = typeof user.settings === 'object' && user.settings !== null ? user.settings as Record<string, any> : {};
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                settings: {
                    ...currentSettings,
                    passwordReset: {
                        code: resetCode,
                        hashedToken, // Store hashed token, not plaintext
                        expiresAt: expiresAt.toISOString(),
                        attempts: 0,
                    },
                },
            },
        });

        // Send forgot password email - use SalesOS or IRIS branding based on origin
        const appUrl = this.isSalesOSOrigin(origin) ? 'https://salesos.org' : this.appUrl;
        const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

        if (this.isSalesOSOrigin(origin)) {
            await this.salesOSEmailService.sendForgotPasswordEmail({
                to: email,
                userName: user.name || undefined,
                resetCode,
                resetToken,
                expirationMinutes: 30,
            });
        } else {
            await this.premiumEmailService.sendForgotPasswordEmail(email, {
                userName: user.name || 'there',
                resetCode,
                resetUrl,
                expiresInMinutes: 30,
            });
        }

        await this.applicationLogService.info('AuthService.requestPasswordReset', `Password reset requested for: ${email}`, {
            category: LogCategory.AUTH,
            userId: user.id,
            entityType: 'User',
            entityId: user.id,
            metadata: { ipAddress, userAgent: userAgent?.substring(0, 100) },
            tags: ['password-reset', 'request'],
        });

        return { success: true, message: 'If an account exists with this email, a reset code has been sent.' };
    }

    /**
     * Verify reset code and return a new token for password reset
     * Note: We generate a new token here since the original token is not stored (only its hash)
     */
    async verifyResetCode(email: string, code: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired reset code');
        }

        const settings = user.settings as any;
        const resetData = settings?.passwordReset;

        if (!resetData) {
            throw new BadRequestException('Invalid or expired reset code');
        }

        // Check if code has expired
        if (new Date(resetData.expiresAt) < new Date()) {
            throw new BadRequestException('Reset code has expired');
        }

        // Check max attempts (5)
        if (resetData.attempts >= 5) {
            throw new BadRequestException('Too many failed attempts. Please request a new reset code.');
        }

        // Verify code
        if (resetData.code !== code) {
            // Increment attempts
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    settings: {
                        ...settings,
                        passwordReset: {
                            ...resetData,
                            attempts: resetData.attempts + 1,
                        },
                    },
                },
            });
            throw new BadRequestException('Invalid reset code');
        }

        // Code is valid - generate a new token for the reset step
        // This token will be used in resetPassword() and must be hashed for storage
        const newToken = this.premiumEmailService.generateResetToken(32);
        const hashedToken = this.hashToken(newToken);

        // Update the stored hashed token
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                settings: {
                    ...settings,
                    passwordReset: {
                        ...resetData,
                        hashedToken, // Store new hashed token
                        codeVerified: true, // Mark code as verified
                    },
                },
            },
        });

        await this.applicationLogService.info('AuthService.verifyResetCode', `Reset code verified for: ${email}`, {
            category: LogCategory.AUTH,
            userId: user.id,
            tags: ['password-reset', 'code-verified'],
        });

        return { success: true, token: newToken };
    }

    /**
     * Reset password using token
     */
    async resetPassword(token: string, newPassword: string, ipAddress?: string, userAgent?: string, origin?: string) {
        // Hash the provided token to compare with stored hash
        const hashedToken = this.hashToken(token);

        // Find user by hashed reset token (search in settings JSON field)
        const users = await this.prisma.user.findMany({
            where: {
                settings: {
                    path: ['passwordReset', 'hashedToken'],
                    equals: hashedToken,
                },
            },
        });

        if (users.length === 0) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        const user = users[0];
        const settings = user.settings as any;
        const resetData = settings?.passwordReset;

        if (!resetData || resetData.hashedToken !== hashedToken) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Check if token has expired
        if (new Date(resetData.expiresAt) < new Date()) {
            throw new BadRequestException('Reset token has expired');
        }

        // Hash new password
        const salt = await bcrypt.genSalt();
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset data
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newPasswordHash,
                settings: {
                    ...settings,
                    passwordReset: null,
                },
            },
        });

        // Send password reset confirmation email - use SalesOS or IRIS branding based on origin
        if (this.isSalesOSOrigin(origin)) {
            await this.salesOSEmailService.sendPasswordResetEmail({
                to: user.email,
                userName: user.name || undefined,
            });
        } else {
            await this.premiumEmailService.sendPasswordResetEmail(user.email, {
                userName: user.name || 'there',
                resetUrl: `${this.appUrl}/login`,
                expiresInHours: 0, // N/A for confirmation
                ipAddress,
                userAgent,
            });
        }

        await this.applicationLogService.logTransaction(
            'AuthService.resetPassword',
            'PASSWORD_RESET',
            TransactionStatus.SUCCESS,
            `Password reset completed for: ${user.email}`,
            {
                category: LogCategory.AUTH,
                userId: user.id,
                entityType: 'User',
                entityId: user.id,
                metadata: { ipAddress, userAgent: userAgent?.substring(0, 100) },
                tags: ['password-reset', 'completed'],
            }
        );

        return { success: true, message: 'Password has been reset successfully' };
    }

    /**
     * Accept partner portal invitation
     * Sets password, activates user, and activates partner membership
     */
    async acceptPartnerInvite(token: string, password: string, name?: string, ipAddress?: string, userAgent?: string) {
        // Hash the provided token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user by hashed invite token
        const users = await this.prisma.user.findMany({
            where: {
                settings: {
                    path: ['partnerInvite', 'hashedToken'],
                    equals: hashedToken,
                },
            },
        });

        if (users.length === 0) {
            throw new BadRequestException('Invalid or expired invitation token');
        }

        const user = users[0];
        const settings = user.settings as any;
        const inviteData = settings?.partnerInvite;

        if (!inviteData || inviteData.hashedToken !== hashedToken) {
            throw new BadRequestException('Invalid or expired invitation token');
        }

        // Check if token has expired
        if (new Date(inviteData.expiresAt) < new Date()) {
            throw new BadRequestException('Invitation has expired. Please request a new invitation.');
        }

        // Hash new password
        const salt = await bcrypt.genSalt();
        const newPasswordHash = await bcrypt.hash(password, salt);

        // Update user: set password, activate, clear invite data, optionally set name
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newPasswordHash,
                status: 'ACTIVE',
                name: name || user.name,
                settings: {
                    ...settings,
                    partnerInvite: null, // Clear invite data
                },
            },
        });

        // Activate the partner user membership and add to partner's organization
        if (inviteData.partnerId) {
            await this.prisma.partnerUser.updateMany({
                where: {
                    userId: user.id,
                    partnerId: inviteData.partnerId,
                },
                data: {
                    isActive: true,
                },
            });

            // Get the partner's organization and add the user as a member
            const partner = await this.prisma.partner.findUnique({
                where: { id: inviteData.partnerId },
                select: { organizationId: true },
            });

            if (partner?.organizationId) {
                // Check if user is already a member of the organization
                const existingMembership = await this.prisma.organizationMember.findUnique({
                    where: {
                        userId_organizationId: {
                            userId: user.id,
                            organizationId: partner.organizationId,
                        },
                    },
                });

                if (!existingMembership) {
                    // Create organization membership for the partner user
                    await this.prisma.organizationMember.create({
                        data: {
                            organizationId: partner.organizationId,
                            userId: user.id,
                            role: 'MEMBER', // Partner users get basic member role in the org
                            isActive: true,
                        },
                    });
                    this.logger.log(`Created organization membership for partner user ${user.email}`);
                }
            }
        }

        await this.applicationLogService.logTransaction(
            'AuthService.acceptPartnerInvite',
            'PARTNER_INVITE_ACCEPTED',
            TransactionStatus.SUCCESS,
            `Partner invitation accepted: ${user.email}`,
            {
                category: LogCategory.AUTH,
                userId: user.id,
                entityType: 'User',
                entityId: user.id,
                metadata: { ipAddress, partnerId: inviteData.partnerId },
                tags: ['partner-invite', 'accepted'],
            }
        );

        this.logger.log(`Partner invitation accepted for ${user.email}`);

        return {
            success: true,
            message: 'Your account has been activated. You can now log in to the Partner Portal.',
            email: user.email,
        };
    }

    /**
     * Request magic link login - generates token and sends email
     */
    async requestMagicLink(email: string, ipAddress?: string, userAgent?: string, origin?: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        // Always return success to prevent email enumeration
        if (!user) {
            this.logger.warn(`Magic link requested for non-existent email: ${email}`);
            return { success: true, message: 'If an account exists with this email, a magic link has been sent.' };
        }

        // Generate secure magic link token
        const magicToken = this.premiumEmailService.generateResetToken(48);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes (security best practice)

        // Store magic link token in database (using settings field)
        const currentSettings = typeof user.settings === 'object' && user.settings !== null ? user.settings as Record<string, any> : {};
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                settings: {
                    ...currentSettings,
                    magicLink: {
                        token: magicToken,
                        expiresAt: expiresAt.toISOString(),
                        used: false,
                    },
                },
            },
        });

        // Send magic link email - use SalesOS or IRIS branding based on origin
        const appUrl = this.isSalesOSOrigin(origin) ? 'https://salesos.org' : 'https://engage.iriseller.com';
        const magicToken_str = magicToken; // Avoid variable shadowing

        if (this.isSalesOSOrigin(origin)) {
            await this.salesOSEmailService.sendMagicLinkEmail({
                to: email,
                userName: user.name || undefined,
                magicToken: magicToken_str,
                expirationMinutes: 15,
            });
        } else {
            const magicLinkUrl = `${appUrl}/auth/magic-link?token=${magicToken_str}`;
            await this.premiumEmailService.sendMagicLinkEmail(email, {
                userName: user.name || 'there',
                magicLinkUrl,
                expiresInMinutes: 15,
                ipAddress,
                userAgent,
            });
        }

        await this.applicationLogService.info('AuthService.requestMagicLink', `Magic link requested for: ${email}`, {
            category: LogCategory.AUTH,
            userId: user.id,
            entityType: 'User',
            entityId: user.id,
            metadata: { ipAddress, userAgent: userAgent?.substring(0, 100) },
            tags: ['magic-link', 'request'],
        });

        return { success: true, message: 'If an account exists with this email, a magic link has been sent.' };
    }

    /**
     * Verify magic link and log user in
     */
    async verifyMagicLink(token: string, ipAddress?: string, userAgent?: string) {
        // Find user by magic link token
        const users = await this.prisma.user.findMany({
            where: {
                settings: {
                    path: ['magicLink', 'token'],
                    equals: token,
                },
            },
        });

        if (users.length === 0) {
            throw new BadRequestException('Invalid or expired magic link');
        }

        const user = users[0];
        const settings = user.settings as any;
        const magicLinkData = settings?.magicLink;

        if (!magicLinkData || magicLinkData.token !== token) {
            throw new BadRequestException('Invalid or expired magic link');
        }

        // Check if token has been used
        if (magicLinkData.used) {
            throw new BadRequestException('This magic link has already been used');
        }

        // Check if token has expired
        if (new Date(magicLinkData.expiresAt) < new Date()) {
            throw new BadRequestException('Magic link has expired');
        }

        // Mark token as used
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                settings: {
                    ...settings,
                    magicLink: {
                        ...magicLinkData,
                        used: true,
                    },
                },
                lastLoginAt: new Date(),
            },
        });

        await this.applicationLogService.logTransaction(
            'AuthService.verifyMagicLink',
            'MAGIC_LINK_LOGIN',
            TransactionStatus.SUCCESS,
            `Magic link login successful for: ${user.email}`,
            {
                category: LogCategory.AUTH,
                userId: user.id,
                entityType: 'User',
                entityId: user.id,
                metadata: { ipAddress, userAgent: userAgent?.substring(0, 100) },
                tags: ['magic-link', 'login-success'],
            }
        );

        // Send login notification email (non-blocking, respects admin settings AND user preferences)
        // Use an async IIFE to handle the geo-IP lookup without blocking the response
        const userEmail = user.email;
        const userName = user.name;
        const userId = user.id;
        (async () => {
            try {
                // Check if login notifications are enabled (admin setting)
                const isEnabled = await this.systemSettingsService.isLoginNotificationsEnabled();
                if (!isEnabled) {
                    this.logger.log(`Login notification disabled for ${userEmail} (admin setting)`);
                    return;
                }

                // Check if user has email notifications enabled (user preference)
                const userEmailEnabled = await this.isUserEmailEnabled(userId);
                if (!userEmailEnabled) {
                    this.logger.log(`Login notification disabled for ${userEmail} (user preference)`);
                    return;
                }

                const { device, browser } = this.parseUserAgent(userAgent || '');
                const loginTime = new Date().toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                });

                // Look up location from IP (with timeout) - check if geo-IP is enabled
                const geoIpEnabled = await this.systemSettingsService.isGeoIpLookupEnabled();
                const location = geoIpEnabled
                    ? await this.getLocationFromIp(ipAddress || '')
                    : 'Unknown';

                // Check if user is a partner user to link to correct security page
                let isPortalUser = false;
                try {
                    const portalUser = await this.prisma.partnerUser.findFirst({
                        where: {
                            userId: userId,
                            isActive: true,
                            partner: {
                                portalEnabled: true,
                                status: 'APPROVED',
                            },
                        },
                        select: { id: true },
                    });
                    isPortalUser = !!portalUser;
                    this.logger.log(`Portal user check (magic-link) for ${userEmail}: isPortalUser=${isPortalUser}, found=${!!portalUser}`);
                } catch (e) {
                    this.logger.warn(`Partner check error (magic-link) for ${userEmail}: ${e.message}`);
                }

                await this.salesOSEmailService.sendLoginNotificationEmail({
                    to: userEmail,
                    userName: userName || 'there',
                    loginTime,
                    ipAddress: ipAddress || 'Unknown',
                    location,
                    device,
                    browser,
                    isPortalUser,
                });
            } catch (err) {
                this.logger.warn(`Failed to send login notification to ${userEmail}: ${err.message}`);
            }
        })();

        // Fetch organization for JWT payload
        let primaryOrganizationId: string | undefined;
        const membershipForToken = await this.prisma.organizationMember.findFirst({
            where: { userId: user.id, isActive: true },
            include: {
                organization: {
                    select: { id: true, status: true }
                }
            }
        });
        if (membershipForToken?.organization?.status === 'ACTIVE') {
            primaryOrganizationId = membershipForToken.organization.id;
        }

        // Generate unique JWT ID for token revocation support
        const jti = crypto.randomUUID();
        const expiresIn = 60 * 60; // 1 hour in seconds
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        // Return JWT token and user data
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            organizationId: primaryOrganizationId, // Multi-tenant
            jti, // JWT ID for token revocation
        };

        // Track this session for "logout all" functionality
        this.tokenBlacklistService.trackSession(user.id, jti, expiresAt).catch(err => {
            this.logger.warn(`Failed to track magic link session: ${err.message}`);
        });

        // Generate CSRF token bound to this session
        const csrfToken = this.csrfService.generateCsrfToken(jti);

        return {
            access_token: this.jwtService.sign(payload),
            csrf_token: csrfToken, // CSRF token for state-changing requests
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                role: user.role,
                organizationId: primaryOrganizationId,
            },
        };
    }

    /**
     * Logout - revoke the current token
     * @param jti - The JWT ID from the current token
     * @param userId - The user ID
     * @param expiresAt - When the token expires
     */
    async logout(jti: string, userId: string, expiresAt: Date): Promise<{ success: boolean; message: string }> {
        try {
            await this.tokenBlacklistService.revokeToken(jti, expiresAt, userId);
            await this.tokenBlacklistService.untrackSession(userId, jti);

            await this.applicationLogService.logTransaction(
                'AuthService.logout',
                'USER_LOGOUT',
                TransactionStatus.SUCCESS,
                `User logged out`,
                {
                    category: LogCategory.AUTH,
                    userId,
                    entityType: 'User',
                    entityId: userId,
                    tags: ['logout', 'session-end'],
                }
            );

            return { success: true, message: 'Successfully logged out' };
        } catch (error) {
            this.logger.error(`Logout failed for user ${userId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Logout from all sessions - revoke all tokens for a user
     * @param userId - The user ID
     */
    async logoutAllSessions(userId: string): Promise<{ success: boolean; message: string; sessionsRevoked: number }> {
        try {
            const sessionsRevoked = await this.tokenBlacklistService.revokeAllUserSessions(userId);

            await this.applicationLogService.logTransaction(
                'AuthService.logoutAllSessions',
                'USER_LOGOUT_ALL',
                TransactionStatus.SUCCESS,
                `User logged out from all ${sessionsRevoked} sessions`,
                {
                    category: LogCategory.AUTH,
                    userId,
                    entityType: 'User',
                    entityId: userId,
                    metadata: { sessionsRevoked },
                    tags: ['logout', 'logout-all', 'session-end'],
                }
            );

            return {
                success: true,
                message: `Successfully logged out from ${sessionsRevoked} session(s)`,
                sessionsRevoked,
            };
        } catch (error) {
            this.logger.error(`Logout all sessions failed for user ${userId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if a token has been revoked
     * @param jti - The JWT ID to check
     */
    async isTokenRevoked(jti: string): Promise<boolean> {
        return this.tokenBlacklistService.isRevoked(jti);
    }

    /**
     * Get count of active sessions for a user
     * @param userId - The user ID
     */
    async getActiveSessionCount(userId: string): Promise<number> {
        return this.tokenBlacklistService.getActiveSessionCount(userId);
    }
}
