import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private tokenBlacklistService: TokenBlacklistService,
    ) {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        // SECURITY: Require JWT_SECRET in production - no default fallback
        if (!jwtSecret && process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL: JWT_SECRET environment variable is required in production');
        }
        if (!jwtSecret) {
            // Use stderr for startup warnings - Logger not available in constructor super() context
            process.stderr.write('[JwtStrategy] WARNING: Using default JWT_SECRET - DO NOT use in production!\n');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret || 'dev-only-secret-not-for-production',
        });
    }

    async validate(payload: any) {
        // SECURITY: Check if token has been revoked (logout)
        if (payload.jti) {
            const isRevoked = await this.tokenBlacklistService.isRevoked(payload.jti);
            if (isRevoked) {
                throw new UnauthorizedException('Token has been revoked');
            }
        }

        return {
            id: payload.sub,
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            organizationId: payload.organizationId, // Multi-tenant: user's primary organization
            jti: payload.jti, // Pass jti for logout functionality
        };
    }
}
