import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { PandaDocService } from './pandadoc.service';
import { PandaDocController } from './pandadoc.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PandaDocController],
  providers: [PandaDocService],
  exports: [PandaDocService],
})
export class PandaDocModule {}
