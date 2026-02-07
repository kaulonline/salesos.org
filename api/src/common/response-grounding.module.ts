/**
 * Response Grounding Module
 *
 * Provides the ResponseGroundingService for verifying AI responses
 * against tool execution facts before sending to users.
 */

import { Module, Global } from '@nestjs/common';
import { ResponseGroundingService } from './response-grounding.service';

@Global()
@Module({
  providers: [ResponseGroundingService],
  exports: [ResponseGroundingService],
})
export class ResponseGroundingModule {}
