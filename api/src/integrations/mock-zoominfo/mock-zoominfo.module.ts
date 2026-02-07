/**
 * Mock ZoomInfo Module
 *
 * Provides mock ZoomInfo API endpoints for testing without real credentials.
 * Enable by setting MOCK_ZOOMINFO_ENABLED=true in environment.
 */

import { Module } from '@nestjs/common';
import { MockZoomInfoController } from './mock-zoominfo.controller';

@Module({
  controllers: [MockZoomInfoController],
  exports: [],
})
export class MockZoomInfoModule {}
