import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../database/prisma.module';
import { TokenBlacklistService } from './token-blacklist.service';
import { CsrfService } from './csrf.service';
import { RedisCacheModule } from '../cache/cache.module';

@Module({
    imports: [
        PrismaModule,
        PassportModule,
        RedisCacheModule, // For token blacklist storage
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const jwtSecret = configService.get<string>('JWT_SECRET');
                // SECURITY: Require JWT_SECRET in production - no default fallback
                if (!jwtSecret) {
                    if (process.env.NODE_ENV === 'production') {
                        throw new Error('CRITICAL: JWT_SECRET environment variable is required in production');
                    }
                    // Only allow default in development with warning
                    // Use stderr for startup warnings - Logger not available in module factory
                    process.stderr.write('[AuthModule] WARNING: Using default JWT_SECRET - DO NOT use in production!\n');
                }
                return {
                    secret: jwtSecret || 'dev-only-secret-not-for-production',
                    signOptions: {
                        expiresIn: '1h', // SECURITY: Reduced from 7d to 1h
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, LocalStrategy, JwtStrategy, TokenBlacklistService, CsrfService],
    exports: [AuthService, TokenBlacklistService, CsrfService],
})
export class AuthModule { }
