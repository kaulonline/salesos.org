import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { SnowflakeService } from './snowflake.service';
import { SnowflakeController } from './snowflake.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SnowflakeController],
  providers: [SnowflakeService],
  exports: [SnowflakeService],
})
export class SnowflakeModule {}
