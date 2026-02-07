import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { MicrosoftGraphController } from './microsoft-graph.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MicrosoftGraphController],
  providers: [MicrosoftGraphService],
  exports: [MicrosoftGraphService],
})
export class MicrosoftGraphModule {}
