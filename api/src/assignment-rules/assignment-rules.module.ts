import { Module } from '@nestjs/common';
import { AssignmentRulesService } from './assignment-rules.service';
import { AssignmentRulesController } from './assignment-rules.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AssignmentRulesController],
  providers: [AssignmentRulesService],
  exports: [AssignmentRulesService],
})
export class AssignmentRulesModule {}
