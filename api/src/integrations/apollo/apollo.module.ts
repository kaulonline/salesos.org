import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { ApolloService } from './apollo.service';
import { ApolloController } from './apollo.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ApolloController],
  providers: [ApolloService],
  exports: [ApolloService],
})
export class ApolloModule {}
