import { Module } from '@nestjs/common';
import { ESignatureService } from './esignature.service';
import { ESignatureController } from './esignature.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ESignatureController],
  providers: [ESignatureService],
  exports: [ESignatureService],
})
export class ESignatureModule {}
