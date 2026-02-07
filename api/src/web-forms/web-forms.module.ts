import { Module } from '@nestjs/common';
import { WebFormsService } from './web-forms.service';
import { WebFormsController } from './web-forms.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WebFormsController],
  providers: [WebFormsService],
  exports: [WebFormsService],
})
export class WebFormsModule {}
