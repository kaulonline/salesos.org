import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { CollaborationService } from './collaboration.service';
import { LocksService } from './locks.service';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationController } from './collaboration.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'super-secret-key-change-in-prod',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService, LocksService, CollaborationGateway],
  exports: [CollaborationService, LocksService, CollaborationGateway],
})
export class CollaborationModule {}
