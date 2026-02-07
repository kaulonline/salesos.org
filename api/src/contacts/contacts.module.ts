import { Module, forwardRef } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { PrismaModule } from '../database/prisma.module';
import { EnrichmentModule } from '../integrations/enrichment/enrichment.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => EnrichmentModule),
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
