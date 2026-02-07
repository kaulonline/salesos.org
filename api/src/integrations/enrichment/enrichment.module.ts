import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { EnrichmentService } from './enrichment.service';
import { EnrichmentController } from './enrichment.controller';
import { ZoominfoModule } from '../zoominfo/zoominfo.module';
import { ApolloModule } from '../apollo/apollo.module';
import { ClearbitModule } from '../clearbit/clearbit.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ZoominfoModule,
    ApolloModule,
    ClearbitModule,
  ],
  controllers: [EnrichmentController],
  providers: [EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
