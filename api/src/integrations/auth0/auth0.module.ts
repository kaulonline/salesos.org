import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { Auth0Service } from './auth0.service';
import { Auth0Controller } from './auth0.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [Auth0Controller],
  providers: [Auth0Service],
  exports: [Auth0Service],
})
export class Auth0Module {}
