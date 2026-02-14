import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  Headers,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { EmailTrackingUtils } from './email-tracking.utils';

/**
 * Controller for tracking pixel and click tracking endpoints
 * These endpoints are called when users open emails or click links
 */
@ApiTags('Tracking Pixel')
@ApiBearerAuth('JWT')
@Controller('email-tracking')
export class TrackingPixelController {
  private readonly logger = new Logger(TrackingPixelController.name);

  // 1x1 transparent GIF (43 bytes)
  private readonly transparentGif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
  );

  constructor(private readonly trackingUtils: EmailTrackingUtils) {}

  /**
   * Tracking pixel endpoint - called when email is opened
   * Returns a 1x1 transparent GIF and records the open event
   */
  @Get('pixel/:encodedId.gif')
  async trackOpen(
    @Param('encodedId') encodedId: string,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    try {
      // Decode the tracking ID
      const trackingId = Buffer.from(encodedId, 'base64url').toString();
      
      this.logger.debug(`Email opened: ${trackingId}`);

      // Record the open event asynchronously (don't block response)
      this.trackingUtils
        .recordTrackingEvent(trackingId, 'OPEN', { userAgent, ip })
        .catch((err) => this.logger.error(`Failed to record open: ${err.message}`));

    } catch (error) {
      this.logger.debug(`Invalid tracking pixel request: ${error.message}`);
    }

    // Always return the transparent GIF
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': this.transparentGif.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.send(this.transparentGif);
  }

  /**
   * Click tracking endpoint - redirects to original URL after recording click
   */
  @Get('click/:encodedTrackingId/:encodedUrl')
  async trackClick(
    @Param('encodedTrackingId') encodedTrackingId: string,
    @Param('encodedUrl') encodedUrl: string,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    let originalUrl = 'https://iris-crm.com'; // Fallback URL

    try {
      // Decode the tracking ID and URL
      const trackingId = Buffer.from(encodedTrackingId, 'base64url').toString();
      originalUrl = Buffer.from(encodedUrl, 'base64url').toString();

      this.logger.debug(`Link clicked: ${trackingId} -> ${originalUrl}`);

      // Record the click event asynchronously
      this.trackingUtils
        .recordTrackingEvent(trackingId, 'CLICK', { url: originalUrl, userAgent, ip })
        .catch((err) => this.logger.error(`Failed to record click: ${err.message}`));

    } catch (error) {
      this.logger.debug(`Invalid click tracking request: ${error.message}`);
    }

    // Redirect to the original URL
    res.redirect(302, originalUrl);
  }

  /**
   * Beacon endpoint for JavaScript-based tracking (backup method)
   */
  @Get('beacon/:encodedId')
  async trackBeacon(
    @Param('encodedId') encodedId: string,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    try {
      const trackingId = Buffer.from(encodedId, 'base64url').toString();
      
      await this.trackingUtils.recordTrackingEvent(trackingId, 'OPEN', { userAgent, ip });
      
    } catch (error) {
      this.logger.debug(`Invalid beacon request: ${error.message}`);
    }

    // Return empty response
    res.status(204).send();
  }
}
