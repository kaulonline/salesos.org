import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { createHash, randomBytes } from 'crypto';

/**
 * Email Tracking Utilities
 * 
 * Provides invisible tracking mechanisms for emails:
 * 1. Unique tracking IDs for each email
 * 2. Tracking pixel for open detection
 * 3. Link wrapping for click tracking
 * 4. Hidden thread markers for reply matching
 */
@Injectable()
export class EmailTrackingUtils {
  private readonly logger = new Logger(EmailTrackingUtils.name);
  private readonly baseUrl: string;
  private readonly trackingSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:4000');
    this.trackingSecret = this.configService.get<string>('EMAIL_TRACKING_SECRET', 'iris-tracking-secret-key');
  }

  /**
   * Generate a unique tracking ID for an email
   * Format: iris_trk_{timestamp}_{random}_{hash}
   */
  generateTrackingId(threadId: string, messageId: string): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    const hash = this.generateHash(`${threadId}:${messageId}:${timestamp}`).substring(0, 8);
    return `iris_trk_${timestamp}_${random}_${hash}`;
  }

  /**
   * Generate a secure hash for verification
   */
  private generateHash(data: string): string {
    return createHash('sha256')
      .update(`${data}:${this.trackingSecret}`)
      .digest('hex');
  }

  /**
   * Verify a tracking ID hash
   */
  verifyTrackingId(trackingId: string, threadId: string, messageId: string): boolean {
    const parts = trackingId.split('_');
    if (parts.length !== 4 || parts[0] !== 'iris' || parts[1] !== 'trk') {
      return false;
    }
    const timestamp = parts[2];
    const expectedHash = this.generateHash(`${threadId}:${messageId}:${timestamp}`).substring(0, 8);
    return parts[3].endsWith(expectedHash);
  }

  /**
   * Generate invisible tracking pixel HTML
   * This 1x1 transparent GIF loads when email is opened
   */
  generateTrackingPixel(trackingId: string): string {
    const encodedId = Buffer.from(trackingId).toString('base64url');
    const pixelUrl = `${this.baseUrl}/api/email-tracking/pixel/${encodedId}.gif`;
    
    // Multiple fallback methods for tracking
    return `
<!-- IRIS Tracking -->
<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;margin:0;padding:0;opacity:0;" />
<div style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;visibility:hidden;mso-hide:all;">
  <!--[IRIS:${trackingId}]-->
</div>`;
  }

  /**
   * Generate hidden thread marker for reply detection
   * This is embedded invisibly in the email and survives most email client transformations
   */
  generateThreadMarker(trackingId: string, threadId: string): string {
    const encodedData = Buffer.from(JSON.stringify({
      tid: trackingId,
      thd: threadId,
      ts: Date.now(),
    })).toString('base64url');

    // Multiple invisible markers for redundancy
    return `
<!-- Thread Marker Start -->
<div style="display:none!important;visibility:hidden!important;opacity:0!important;font-size:0!important;line-height:0!important;height:0!important;width:0!important;max-height:0!important;max-width:0!important;overflow:hidden!important;mso-hide:all!important;">
  <span data-iris-thread="${encodedData}">&#8203;</span>
  [IRIS-THREAD:${trackingId}:${threadId}]
</div>
<div style="color:#ffffff!important;background:#ffffff!important;font-size:1px!important;line-height:1px!important;max-height:1px!important;opacity:0.01!important;">
  ${trackingId}
</div>
<!-- Thread Marker End -->`;
  }

  /**
   * Generate a custom Message-ID header that includes our tracking info
   * Format: <trackingId.threadId.timestamp@iris-crm.com>
   */
  generateMessageIdHeader(trackingId: string, threadId: string): string {
    const timestamp = Date.now().toString(36);
    const domain = 'iris-crm.com';
    return `<${trackingId}.${threadId}.${timestamp}@${domain}>`;
  }

  /**
   * Wrap links with tracking redirects
   * Replaces URLs with tracked versions that redirect through our server
   */
  wrapLinksWithTracking(html: string, trackingId: string): string {
    // Match href attributes with URLs
    const urlPattern = /href=["'](https?:\/\/[^"']+)["']/gi;
    
    return html.replace(urlPattern, (match, url) => {
      // Skip tracking pixel URLs and our own URLs
      if (url.includes('/api/email-tracking/') || url.includes('iris-crm.com')) {
        return match;
      }

      const encodedUrl = Buffer.from(url).toString('base64url');
      const encodedTrackingId = Buffer.from(trackingId).toString('base64url');
      const trackedUrl = `${this.baseUrl}/api/email-tracking/click/${encodedTrackingId}/${encodedUrl}`;
      
      return `href="${trackedUrl}"`;
    });
  }

  /**
   * Extract tracking ID from an email body (for inbound emails)
   * Searches for our hidden markers in the quoted/forwarded content
   */
  extractTrackingIdFromBody(body: string): { trackingId?: string; threadId?: string } {
    const result: { trackingId?: string; threadId?: string } = {};

    // Method 1: Look for IRIS-THREAD marker
    const threadMarkerMatch = body.match(/\[IRIS-THREAD:([a-zA-Z0-9_]+):([a-zA-Z0-9]+)\]/);
    if (threadMarkerMatch) {
      result.trackingId = threadMarkerMatch[1];
      result.threadId = threadMarkerMatch[2];
      return result;
    }

    // Method 2: Look for IRIS comment marker
    const commentMatch = body.match(/<!--\[IRIS:([a-zA-Z0-9_]+)\]-->/);
    if (commentMatch) {
      result.trackingId = commentMatch[1];
    }

    // Method 3: Look for data attribute (sometimes preserved)
    const dataAttrMatch = body.match(/data-iris-thread="([^"]+)"/);
    if (dataAttrMatch) {
      try {
        const decoded = JSON.parse(Buffer.from(dataAttrMatch[1], 'base64url').toString());
        result.trackingId = decoded.tid;
        result.threadId = decoded.thd;
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Method 4: Look for tracking ID pattern in white text
    const hiddenTextMatch = body.match(/iris_trk_[a-z0-9]+_[a-f0-9]+_[a-f0-9]+/);
    if (hiddenTextMatch && !result.trackingId) {
      result.trackingId = hiddenTextMatch[0];
    }

    return result;
  }

  /**
   * Add all tracking elements to an email HTML body
   */
  injectTrackingElements(
    html: string,
    trackingId: string,
    threadId: string,
    options: { wrapLinks?: boolean; addPixel?: boolean } = {},
  ): string {
    const { wrapLinks = true, addPixel = true } = options;

    let trackedHtml = html;

    // Add tracking pixel before closing body tag
    if (addPixel) {
      const pixel = this.generateTrackingPixel(trackingId);
      if (trackedHtml.includes('</body>')) {
        trackedHtml = trackedHtml.replace('</body>', `${pixel}</body>`);
      } else {
        trackedHtml += pixel;
      }
    }

    // Add hidden thread marker
    const threadMarker = this.generateThreadMarker(trackingId, threadId);
    if (trackedHtml.includes('</body>')) {
      trackedHtml = trackedHtml.replace('</body>', `${threadMarker}</body>`);
    } else {
      trackedHtml += threadMarker;
    }

    // Wrap links with tracking
    if (wrapLinks) {
      trackedHtml = this.wrapLinksWithTracking(trackedHtml, trackingId);
    }

    return trackedHtml;
  }

  /**
   * Record a tracking event (open, click, etc.)
   */
  async recordTrackingEvent(
    trackingId: string,
    eventType: 'OPEN' | 'CLICK',
    metadata?: { url?: string; userAgent?: string; ip?: string },
  ): Promise<void> {
    try {
      // Find the email message by tracking ID pattern in our custom message ID
      const email = await this.prisma.emailMessage.findFirst({
        where: {
          OR: [
            { messageId: { contains: trackingId } },
            { metadata: { path: ['trackingId'], equals: trackingId } },
          ],
        },
      });

      if (!email) {
        this.logger.warn(`Email not found for tracking ID: ${trackingId}`);
        return;
      }

      const now = new Date();
      const updateData: any = {};

      if (eventType === 'OPEN' && !email.openedAt) {
        updateData.openedAt = now;
        updateData.status = 'OPENED';
      } else if (eventType === 'CLICK' && !email.clickedAt) {
        updateData.clickedAt = now;
        updateData.status = 'CLICKED';
      }

      // Store event in metadata
      const existingMetadata = (email.metadata as any) || {};
      const events = existingMetadata.trackingEvents || [];
      events.push({
        type: eventType,
        timestamp: now.toISOString(),
        ...metadata,
      });

      updateData.metadata = {
        ...existingMetadata,
        trackingEvents: events,
        trackingId,
      };

      await this.prisma.emailMessage.update({
        where: { id: email.id },
        data: updateData,
      });

      this.logger.log(`Recorded ${eventType} event for email ${email.id}`);
    } catch (error) {
      this.logger.error(`Failed to record tracking event: ${error.message}`);
    }
  }
}
