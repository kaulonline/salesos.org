import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { TerritoriesController } from './territories.controller';
import { TerritoriesService } from './territories.service';

@Module({
  imports: [PrismaModule],
  controllers: [TerritoriesController],
  providers: [TerritoriesService],
  exports: [TerritoriesService],
})
export class TerritoriesModule {}
