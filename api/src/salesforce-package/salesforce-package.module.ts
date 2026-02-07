import { Module } from '@nestjs/common';
import { SalesforcePackageController } from './salesforce-package.controller';
import { SalesforcePackageService } from './salesforce-package.service';
import { SalesforcePackageAuthService } from './salesforce-package-auth.service';
import { PrismaModule } from '../database/prisma.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { RedisCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    PrismaModule,
    ConversationsModule,
    RedisCacheModule,
  ],
  controllers: [SalesforcePackageController],
  providers: [
    SalesforcePackageService,
    SalesforcePackageAuthService,
  ],
  exports: [SalesforcePackageService, SalesforcePackageAuthService],
})
export class SalesforcePackageModule {}
