/**
 * Meeting URL Parser Service
 * 
 * Parses meeting URLs from various platforms (Zoom, Teams, Google Meet, Webex)
 * to extract meeting IDs, passwords, and other join information.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ParsedMeetingUrl {
  platform: 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET' | 'WEBEX' | 'OTHER';
  meetingId: string;
  password?: string;
  joinUrl: string;
  hostDomain?: string;
  originalUrl: string;
}

@Injectable()
export class MeetingUrlParserService {
  private readonly logger = new Logger(MeetingUrlParserService.name);

  /**
   * Parse any meeting URL and extract platform-specific information
   */
  parse(url: string): ParsedMeetingUrl | null {
    try {
      const normalizedUrl = this.normalizeUrl(url);
      
      // Try each platform parser
      const parsers = [
        this.parseZoomUrl.bind(this),
        this.parseTeamsUrl.bind(this),
        this.parseGoogleMeetUrl.bind(this),
        this.parseWebexUrl.bind(this),
      ];

      for (const parser of parsers) {
        const result = parser(normalizedUrl);
        if (result) {
          this.logger.log(`Parsed ${result.platform} meeting: ${result.meetingId}`);
          return result;
        }
      }

      this.logger.warn(`Could not parse meeting URL: ${url}`);
      return null;
    } catch (error) {
      this.logger.error(`Error parsing meeting URL: ${error}`);
      return null;
    }
  }

  /**
   * Normalize URL for parsing
   */
  private normalizeUrl(url: string): string {
    let normalized = url.trim();
    
    // Add protocol if missing
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    
    return normalized;
  }

  /**
   * Parse Zoom meeting URLs
   * Formats:
   * - https://zoom.us/j/1234567890?pwd=abc123
   * - https://us02web.zoom.us/j/1234567890
   * - https://company.zoom.us/j/1234567890
   * - zoommtg://zoom.us/join?confno=1234567890&pwd=abc123
   */
  private parseZoomUrl(url: string): ParsedMeetingUrl | null {
    // Check if it's a Zoom URL
    if (!url.includes('zoom.us') && !url.startsWith('zoommtg://')) {
      return null;
    }

    try {
      let meetingId: string | null = null;
      let password: string | undefined;
      let hostDomain: string | undefined;

      // Handle zoommtg:// protocol
      if (url.startsWith('zoommtg://')) {
        const params = new URLSearchParams(url.split('?')[1] || '');
        meetingId = params.get('confno');
        password = params.get('pwd') || undefined;
      } else {
        const urlObj = new URL(url);
        hostDomain = urlObj.hostname;
        
        // Extract meeting ID from path: /j/1234567890
        const pathMatch = urlObj.pathname.match(/\/j\/(\d+)/);
        if (pathMatch) {
          meetingId = pathMatch[1];
        }
        
        // Extract password from query params
        password = urlObj.searchParams.get('pwd') || undefined;
      }

      if (!meetingId) {
        return null;
      }

      // Clean meeting ID (remove any spaces or dashes)
      meetingId = meetingId.replace(/[\s-]/g, '');

      return {
        platform: 'ZOOM',
        meetingId,
        password,
        joinUrl: url,
        hostDomain,
        originalUrl: url,
      };
    } catch (error) {
      this.logger.debug(`Failed to parse as Zoom URL: ${url}`);
      return null;
    }
  }

  /**
   * Parse Microsoft Teams meeting URLs
   * Format: https://teams.microsoft.com/l/meetup-join/...
   */
  private parseTeamsUrl(url: string): ParsedMeetingUrl | null {
    if (!url.includes('teams.microsoft.com') && !url.includes('teams.live.com')) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      
      // Teams URLs encode meeting info in the path
      // Format: /l/meetup-join/19%3ameeting_...
      const pathMatch = urlObj.pathname.match(/meetup-join\/([^\/]+)/);
      if (!pathMatch) {
        // Try channel meeting format
        const channelMatch = urlObj.pathname.match(/\/([^\/]+)\/([^\/]+)$/);
        if (channelMatch) {
          return {
            platform: 'TEAMS',
            meetingId: channelMatch[2],
            joinUrl: url,
            hostDomain: urlObj.hostname,
            originalUrl: url,
          };
        }
        return null;
      }

      // Decode the meeting thread ID
      const meetingThreadId = decodeURIComponent(pathMatch[1]);
      
      // Extract a simpler meeting ID for display
      const meetingIdMatch = meetingThreadId.match(/meeting_([a-zA-Z0-9]+)/);
      const meetingId = meetingIdMatch ? meetingIdMatch[1] : meetingThreadId.substring(0, 20);

      return {
        platform: 'TEAMS',
        meetingId,
        joinUrl: url,
        hostDomain: urlObj.hostname,
        originalUrl: url,
      };
    } catch (error) {
      this.logger.debug(`Failed to parse as Teams URL: ${url}`);
      return null;
    }
  }

  /**
   * Parse Google Meet URLs
   * Formats:
   * - https://meet.google.com/abc-defg-hij
   * - https://meet.google.com/lookup/abc123
   */
  private parseGoogleMeetUrl(url: string): ParsedMeetingUrl | null {
    if (!url.includes('meet.google.com')) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      
      // Standard format: /abc-defg-hij
      const meetingCodeMatch = urlObj.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
      if (meetingCodeMatch) {
        return {
          platform: 'GOOGLE_MEET',
          meetingId: meetingCodeMatch[1],
          joinUrl: url,
          hostDomain: urlObj.hostname,
          originalUrl: url,
        };
      }

      // Lookup format: /lookup/abc123
      const lookupMatch = urlObj.pathname.match(/\/lookup\/([a-zA-Z0-9]+)/);
      if (lookupMatch) {
        return {
          platform: 'GOOGLE_MEET',
          meetingId: lookupMatch[1],
          joinUrl: url,
          hostDomain: urlObj.hostname,
          originalUrl: url,
        };
      }

      // Fallback: any path segment
      const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);
      if (pathSegments.length > 0) {
        return {
          platform: 'GOOGLE_MEET',
          meetingId: pathSegments[pathSegments.length - 1],
          joinUrl: url,
          hostDomain: urlObj.hostname,
          originalUrl: url,
        };
      }

      return null;
    } catch (error) {
      this.logger.debug(`Failed to parse as Google Meet URL: ${url}`);
      return null;
    }
  }

  /**
   * Parse Webex meeting URLs
   * Formats:
   * - https://company.webex.com/meet/username
   * - https://company.webex.com/company/j.php?MTID=abc123
   * - https://company.webex.com/join/1234567890
   */
  private parseWebexUrl(url: string): ParsedMeetingUrl | null {
    if (!url.includes('webex.com')) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      const hostDomain = urlObj.hostname;
      
      // Personal room: /meet/username
      const meetMatch = urlObj.pathname.match(/\/meet\/([a-zA-Z0-9._-]+)/i);
      if (meetMatch) {
        return {
          platform: 'WEBEX',
          meetingId: meetMatch[1],
          joinUrl: url,
          hostDomain,
          originalUrl: url,
        };
      }

      // Meeting with ID: /j.php?MTID=abc123
      const mtidMatch = urlObj.searchParams.get('MTID');
      if (mtidMatch) {
        return {
          platform: 'WEBEX',
          meetingId: mtidMatch,
          joinUrl: url,
          hostDomain,
          originalUrl: url,
        };
      }

      // Direct join: /join/1234567890
      const joinMatch = urlObj.pathname.match(/\/join\/(\d+)/);
      if (joinMatch) {
        return {
          platform: 'WEBEX',
          meetingId: joinMatch[1],
          joinUrl: url,
          hostDomain,
          originalUrl: url,
        };
      }

      return null;
    } catch (error) {
      this.logger.debug(`Failed to parse as Webex URL: ${url}`);
      return null;
    }
  }

  /**
   * Detect platform from URL without full parsing
   */
  detectPlatform(url: string): 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET' | 'WEBEX' | 'OTHER' {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('zoom.us') || lowerUrl.startsWith('zoommtg://')) {
      return 'ZOOM';
    }
    if (lowerUrl.includes('teams.microsoft.com') || lowerUrl.includes('teams.live.com')) {
      return 'TEAMS';
    }
    if (lowerUrl.includes('meet.google.com')) {
      return 'GOOGLE_MEET';
    }
    if (lowerUrl.includes('webex.com')) {
      return 'WEBEX';
    }
    
    return 'OTHER';
  }

  /**
   * Validate if a URL is a supported meeting URL
   */
  isValidMeetingUrl(url: string): boolean {
    return this.parse(url) !== null;
  }

  /**
   * Build a join URL with bot-friendly parameters
   */
  buildBotJoinUrl(parsed: ParsedMeetingUrl, botName: string = 'IRIS Agent'): string {
    switch (parsed.platform) {
      case 'ZOOM':
        // Zoom SDK joins using meeting number, not URL
        // But we can construct a proper join URL
        let zoomUrl = `https://zoom.us/wc/${parsed.meetingId}/join`;
        if (parsed.password) {
          zoomUrl += `?pwd=${parsed.password}`;
        }
        return zoomUrl;
        
      case 'TEAMS':
        // Teams URL is used as-is
        return parsed.joinUrl;
        
      case 'GOOGLE_MEET':
        // Google Meet URL is used as-is
        return parsed.joinUrl;
        
      case 'WEBEX':
        // Webex URL is used as-is
        return parsed.joinUrl;
        
      default:
        return parsed.joinUrl;
    }
  }
}
