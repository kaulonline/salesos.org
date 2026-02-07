import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../database/prisma.service';
import {
  generatePremiumTemplate,
  generateBodyText,
  generatePremiumButton,
  generatePremiumHeading,
  generatePremiumList,
  generateLineDivider,
  generateInfoGrid,
  generatePremiumCard,
} from './templates/premium-email-templates';
import {
  generateMeetingInviteEmail,
  MeetingInviteEmailParams,
} from './templates/crm-email-templates';

// ==================== INTERFACES ====================

export interface MeetingInviteParams {
  to: string[];
  subject?: string;
  meetingTitle: string;
  meetingDate: Date;
  duration: number;
  joinUrl: string;
  platform: 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET';
  description?: string;
  organizerName?: string;
  organizerEmail?: string;
}

export interface GeneralEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  preheader?: string;
  ctaText?: string;
  ctaUrl?: string;
  /** Skip adding the default signature - use when body already contains a signature */
  skipSignature?: boolean;
}

export interface FollowUpEmailParams {
  to: string | string[];
  subject: string;
  recipientName?: string;
  body: string;
  actionItems?: string[];
  nextSteps?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface AgendaEmailParams {
  to: string | string[];
  subject?: string;
  meetingTitle: string;
  meetingDate: Date;
  duration: number;
  platform?: string;
  agendaItems: string[];
  preparationNotes?: string;
  attendees?: string[];
}

// ==================== UNIFIED TEMPLATE SYSTEM ====================

/**
 * IRIS Brand Colors & Design System
 */
const BRAND = {
  colors: {
    gold: '#c9a882',
    goldDark: '#b8956f',
    dark: '#0b0f17',
    darkLight: '#1a1f2e',
    cream: '#faf9f7',
    creamDark: '#f8f6f3',
    border: '#e8e4df',
    textPrimary: '#1a202c',
    textSecondary: '#4a5568',
    textMuted: '#9ca3af',
    textLight: '#6b7280',
  },
  fonts: {
    primary: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
};

/**
 * Generate the unified IRIS email template wrapper
 */
function generateEmailTemplate(options: {
  title?: string;
  subtitle?: string;
  content: string;
  footerText?: string;
  showBranding?: boolean;
}): string {
  const { title, subtitle, content, footerText, showBranding = true } = options;

  const headerSection = title ? `
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND.colors.dark}; padding: 36px 48px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <div style="display: inline-block; border: 1px solid ${BRAND.colors.gold}; padding: 8px 24px; border-radius: 4px; margin-bottom: 16px;">
                      <span style="font-size: 16px; font-weight: 400; color: ${BRAND.colors.gold}; letter-spacing: 3px; text-transform: uppercase;">IRIS</span>
                    </div>
                    ${title ? `<h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 300; letter-spacing: 0.5px;">${title}</h1>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : `
          <!-- Minimal Header -->
          <tr>
            <td style="background-color: ${BRAND.colors.dark}; padding: 24px 48px; text-align: center;">
              <div style="display: inline-block; border: 1px solid ${BRAND.colors.gold}; padding: 8px 24px; border-radius: 4px;">
                <span style="font-size: 16px; font-weight: 400; color: ${BRAND.colors.gold}; letter-spacing: 3px; text-transform: uppercase;">IRIS</span>
              </div>
            </td>
          </tr>`;

  const subtitleSection = subtitle ? `
          <!-- Subtitle Banner -->
          <tr>
            <td style="background-color: ${BRAND.colors.gold}; padding: 16px 48px; text-align: center;">
              <p style="margin: 0; color: ${BRAND.colors.dark}; font-size: 15px; font-weight: 400; letter-spacing: 0.3px;">${subtitle}</p>
            </td>
          </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>IRIS Sales CRM</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: ${BRAND.fonts.primary}; background-color: ${BRAND.colors.creamDark}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.colors.creamDark};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 16px rgba(0, 0, 0, 0.04);">
          
          ${headerSection}
          ${subtitleSection}

          <!-- Content -->
          <tr>
            <td style="padding: 40px 48px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND.colors.dark}; padding: 24px 48px; text-align: center;">
              ${showBranding ? `
              <p style="margin: 0 0 4px 0; color: ${BRAND.colors.gold}; font-size: 11px; font-weight: 400; letter-spacing: 2px; text-transform: uppercase;">IRIS Sales CRM</p>
              <p style="margin: 0; color: ${BRAND.colors.textLight}; font-size: 11px; font-weight: 300;">AI-First Sales Intelligence</p>
              ` : ''}
              ${footerText ? `<p style="margin: ${showBranding ? '12px' : '0'} 0 0 0; color: ${BRAND.colors.textMuted}; font-size: 11px; font-weight: 300;">${footerText}</p>` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate a styled button
 */
function generateButton(text: string, url: string, style: 'primary' | 'secondary' = 'primary'): string {
  const bgColor = style === 'primary' ? BRAND.colors.gold : 'transparent';
  const textColor = style === 'primary' ? BRAND.colors.dark : BRAND.colors.gold;
  const border = style === 'secondary' ? `border: 1px solid ${BRAND.colors.gold};` : '';
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="text-align: center;">
          <a href="${url}" style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase; ${border}">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Generate a details card (for meeting details, info boxes, etc.)
 */
function generateDetailsCard(rows: { label: string; value: string; icon?: string }[]): string {
  const rowsHtml = rows.map((row, index) => {
    const borderStyle = index < rows.length - 1 ? `border-bottom: 1px solid ${BRAND.colors.border};` : '';
    const paddingStyle = index === 0 ? 'padding-bottom: 16px;' : index === rows.length - 1 ? 'padding-top: 16px;' : 'padding: 16px 0;';
    
    return `
      <tr>
        <td style="${paddingStyle} ${borderStyle}">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="width: 100px; color: ${BRAND.colors.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 400; vertical-align: top; padding-top: 2px;">
                ${row.icon ? `${row.icon} ` : ''}${row.label}
              </td>
              <td style="color: ${BRAND.colors.textPrimary}; font-size: 15px; font-weight: 400; line-height: 1.5;">
                ${row.value}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.colors.cream}; border-radius: 8px; border: 1px solid ${BRAND.colors.border};">
      <tr>
        <td style="padding: 24px 28px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

/**
 * Generate a list (bullet points or numbered)
 */
function generateList(items: string[], ordered: boolean = false): string {
  const listItems = items.map((item, index) => {
    const marker = ordered ? `${index + 1}.` : '•';
    return `
      <tr>
        <td style="padding: 6px 0; color: ${BRAND.colors.textSecondary}; font-size: 14px; line-height: 1.6; font-weight: 300;">
          <span style="color: ${BRAND.colors.gold}; margin-right: 8px;">${marker}</span> ${item}
        </td>
      </tr>`;
  }).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${listItems}
    </table>`;
}

/**
 * Generate paragraph text
 */
function generateParagraph(text: string, style: 'normal' | 'muted' | 'small' = 'normal'): string {
  const styles = {
    normal: `color: ${BRAND.colors.textSecondary}; font-size: 15px; line-height: 1.7; font-weight: 300;`,
    muted: `color: ${BRAND.colors.textMuted}; font-size: 14px; line-height: 1.6; font-weight: 300;`,
    small: `color: ${BRAND.colors.textMuted}; font-size: 12px; line-height: 1.5; font-weight: 300;`,
  };
  
  return `<p style="margin: 0 0 16px 0; ${styles[style]}">${text}</p>`;
}

/**
 * Generate a section heading
 */
function generateHeading(text: string, level: 'h2' | 'h3' = 'h2'): string {
  const styles = {
    h2: `font-size: 16px; color: ${BRAND.colors.textPrimary}; font-weight: 400; letter-spacing: 0.3px; margin: 24px 0 12px 0;`,
    h3: `font-size: 13px; color: ${BRAND.colors.textMuted}; font-weight: 400; letter-spacing: 1px; text-transform: uppercase; margin: 20px 0 10px 0;`,
  };
  
  return `<${level} style="${styles[level]}">${text}</${level}>`;
}

/**
 * Generate a divider
 */
function generateDivider(): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="border-top: 1px solid ${BRAND.colors.border};"></td>
      </tr>
    </table>`;
}

// ==================== EMAIL SERVICE ====================

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Check if a user has email notifications enabled
   * @param userId - The user ID to check
   * @param notificationType - Optional specific notification type to check
   */
  async isEmailEnabledForUser(
    userId: string,
    notificationType?: 'newLeadAssigned' | 'leadStatusChange' | 'dealStageChange' | 'dealWonLost' | 'taskAssigned' | 'taskDueReminder' | 'meetingReminder' | 'dailyDigest' | 'weeklyReport' | 'marketingEmails',
  ): Promise<boolean> {
    try {
      // First check the general email preference in user settings
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};

      // If general email notifications are disabled, return false
      if (settings.emailNotifications === false) {
        return false;
      }

      // If no specific type requested, just check general preference
      if (!notificationType) {
        return true;
      }

      // Check specific notification type preference
      const emailPrefs = await this.prisma.emailNotificationPreferences.findUnique({
        where: { userId },
      });

      if (!emailPrefs) {
        return true; // Default to enabled if no preferences set
      }

      // Check master email toggle
      if (!emailPrefs.emailsEnabled) {
        return false;
      }

      // Check specific notification type
      return emailPrefs[notificationType] ?? true;
    } catch (error) {
      this.logger.warn(`Error checking email preferences for user ${userId}: ${error.message}`);
      return true; // Default to enabled on error
    }
  }

  /**
   * Get user's timezone from settings
   */
  async getUserTimezone(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      return settings.timezone || 'UTC';
    } catch (error) {
      return 'UTC';
    }
  }

  async onModuleInit() {
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailAppPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');

    if (gmailUser && gmailAppPassword) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      try {
        await this.transporter.verify();
        this.isConfigured = true;
        this.logger.log(`Email service configured with Gmail: ${gmailUser}`);
      } catch (error) {
        this.logger.warn(`Gmail configuration failed: ${error.message}`);
        this.isConfigured = false;
      }
    } else {
      this.logger.warn('Gmail credentials not configured - email sending will be disabled');
    }
  }

  /**
   * Check if email service is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Get the Gmail user (for calendar invites)
   */
  getGmailUser(): string {
    return this.configService.get<string>('GMAIL_USER') || '';
  }

  // ==================== EMAIL METHODS ====================

  /**
   * Send a general email with IRIS premium branding
   * @deprecated Use sendGeneralEmail instead for better signature handling
   */
  async sendEmail(params: GeneralEmailParams): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Email service not configured' };
    }

    const { to, subject, body, preheader, ctaText, ctaUrl, skipSignature } = params;

    // Build content using premium template components
    let content = generateBodyText(body.replace(/\n/g, '<br>'));
    
    if (ctaText && ctaUrl) {
      content += generatePremiumButton(ctaText, ctaUrl, 'primary');
    }

    if (!skipSignature) {
      content += generateBodyText('Best regards,<br><strong>IRIS Sales CRM</strong>', { muted: true });
    }

    const html = generatePremiumTemplate({
      preheader: preheader || subject,
      content,
    });

    const plainText = skipSignature ? body.replace(/<[^>]*>/g, '') : `${body.replace(/<[^>]*>/g, '')}\n\nBest regards,\nIRIS Sales CRM`;

    return this.send({
      to,
      subject,
      html,
      text: plainText,
    });
  }

  /**
   * Send a meeting invite with calendar attachment (uses Premium Template)
   */
  async sendMeetingInvite(params: MeetingInviteParams): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      this.logger.warn('Email service not configured - skipping invite email');
      return { success: false, error: 'Email service not configured' };
    }

    const {
      to,
      subject,
      meetingTitle,
      meetingDate,
      duration,
      joinUrl,
      platform,
      description,
      organizerName,
      organizerEmail,
    } = params;

    const gmailUser = this.getGmailUser();

    // Map platform to display name
    const platformName = platform === 'ZOOM' ? 'Zoom' : platform === 'TEAMS' ? 'Microsoft Teams' : 'Google Meet';

    // Format date and time for premium template
    const formattedDate = meetingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = meetingDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Generate premium template
    const premiumParams: MeetingInviteEmailParams = {
      meetingTitle,
      meetingDate: formattedDate,
      meetingTime: formattedTime,
      duration: `${duration} minutes`,
      joinUrl,
      platform: platformName,
      agenda: description,
      organizerName: organizerName || 'IRIS Sales CRM',
      organizerEmail: organizerEmail || gmailUser,
    };

    const { html, text, subject: generatedSubject } = generateMeetingInviteEmail(premiumParams);

    // Generate ICS calendar attachment
    const icsContent = this.generateICS({
      title: meetingTitle,
      startDate: meetingDate,
      duration,
      joinUrl,
      description,
      organizerName: organizerName || 'IRIS Sales CRM',
      organizerEmail: gmailUser,
      attendees: to,
    });

    try {
      await this.transporter!.sendMail({
        from: `"IRIS Sales CRM" <${gmailUser}>`,
        to: to.join(', '),
        subject: subject || generatedSubject,
        text,
        html,
        icalEvent: {
          method: 'REQUEST',
          content: icsContent,
        },
        attachments: [
          {
            filename: 'invite.ics',
            content: icsContent,
            contentType: 'text/calendar; method=REQUEST',
          },
        ],
      });

      this.logger.log(`Calendar invite sent to: ${to.join(', ')} using premium template`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send meeting invite: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send meeting cancellation notification with ICS METHOD:CANCEL
   */
  async sendMeetingCancellation(params: {
    to: string[];
    meetingTitle: string;
    meetingDate: Date;
    reason?: string;
    organizerName?: string;
    icsContent: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      this.logger.warn('Email service not configured - skipping cancellation email');
      return { success: false, error: 'Email service not configured' };
    }

    const { to, meetingTitle, meetingDate, reason, organizerName, icsContent } = params;
    const gmailUser = this.getGmailUser();

    // Format date for display
    const formattedDate = meetingDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Build cancellation email content
    let content = generateBodyText(`The following meeting has been <strong style="color: #dc2626;">cancelled</strong>:`);

    content += generateDetailsCard([
      { label: 'Meeting', value: meetingTitle },
      { label: 'Was scheduled', value: formattedDate },
      { label: 'Organizer', value: organizerName || 'IRIS Sales CRM' },
    ]);

    if (reason) {
      content += generateHeading('Reason', 'h3');
      content += generateParagraph(reason, 'muted');
    }

    content += generateDivider();
    content += generateParagraph('This meeting has been removed from your calendar.', 'small');

    const html = generateEmailTemplate({
      title: 'Meeting Cancelled',
      subtitle: meetingTitle,
      content,
      showBranding: true,
    });

    const plainText = `Meeting Cancelled\n\n${meetingTitle}\nWas scheduled: ${formattedDate}\n${reason ? `\nReason: ${reason}` : ''}\n\nThis meeting has been removed from your calendar.\n\nIRIS Sales CRM`;

    try {
      await this.transporter!.sendMail({
        from: `"IRIS Sales CRM" <${gmailUser}>`,
        to: to.join(', '),
        subject: `Cancelled: ${meetingTitle}`,
        text: plainText,
        html,
        icalEvent: {
          method: 'CANCEL',
          content: icsContent,
        },
        attachments: [
          {
            filename: 'cancel.ics',
            content: icsContent,
            contentType: 'text/calendar; method=CANCEL',
          },
        ],
      });

      this.logger.log(`Cancellation notification sent to: ${to.join(', ')}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send cancellation notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a pre-meeting agenda email
   */
  async sendAgendaEmail(params: AgendaEmailParams): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Email service not configured' };
    }

    const {
      to,
      subject,
      meetingTitle,
      meetingDate,
      duration,
      platform,
      agendaItems,
      preparationNotes,
      attendees,
    } = params;

    const formattedDate = meetingDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // Build content using premium template components
    let content = generateBodyText(`Please find the agenda for our upcoming meeting below.`);

    content += generateInfoGrid([
      { label: 'Meeting', value: meetingTitle },
      { label: 'When', value: formattedDate },
      { label: 'Duration', value: `${duration} minutes` },
      ...(platform ? [{ label: 'Platform', value: platform }] : []),
      ...(attendees && attendees.length > 0 ? [{ label: 'Attendees', value: attendees.join(', ') }] : []),
    ]);

    content += generatePremiumHeading('Agenda', 'h3');
    content += generatePremiumList(agendaItems, 'numbered');

    if (preparationNotes) {
      content += generatePremiumHeading('Preparation Notes', 'h3');
      content += generateBodyText(preparationNotes, { muted: true });
    }

    content += generateLineDivider();
    content += generateBodyText('Please come prepared to discuss these items. Looking forward to a productive meeting!', { muted: true });

    const html = generatePremiumTemplate({
      preheader: `Meeting Agenda: ${meetingTitle}`,
      content,
    });

    const plainText = `Meeting Agenda: ${meetingTitle}\n\nWhen: ${formattedDate}\nDuration: ${duration} minutes\n\nAgenda:\n${agendaItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n${preparationNotes ? `\nPreparation Notes:\n${preparationNotes}` : ''}\n\nSent via IRIS Sales CRM`;

    return this.send({
      to,
      subject: subject || `Meeting Agenda: ${meetingTitle}`,
      html,
      text: plainText,
    });
  }

  /**
   * Send a follow-up email using premium template
   */
  async sendFollowUpEmail(params: FollowUpEmailParams): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Email service not configured' };
    }

    const {
      to,
      subject,
      recipientName,
      body,
      actionItems,
      nextSteps,
      ctaText,
      ctaUrl,
    } = params;

    // Build content using premium template components
    let content = '';
    
    if (recipientName) {
      content += generateBodyText(`Hi ${recipientName},`);
    }

    content += generateBodyText(body.replace(/\n/g, '<br>'));

    if (actionItems && actionItems.length > 0) {
      content += generatePremiumHeading('Action Items', 'h3');
      content += generatePremiumList(actionItems, 'check');
    }

    if (nextSteps) {
      content += generatePremiumHeading('Next Steps', 'h3');
      content += generateBodyText(nextSteps, { muted: true });
    }

    if (ctaText && ctaUrl) {
      content += generatePremiumButton(ctaText, ctaUrl, 'primary');
    }

    content += generateLineDivider();
    content += generateBodyText('Best regards,<br><strong>IRIS Sales CRM</strong>', { muted: true });

    const html = generatePremiumTemplate({
      preheader: subject,
      content,
    });

    const plainText = `${recipientName ? `Hi ${recipientName},\n\n` : ''}${body}\n${actionItems ? `\nAction Items:\n${actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}` : ''}\n${nextSteps ? `\nNext Steps:\n${nextSteps}` : ''}\n\nBest regards,\nIRIS Sales CRM`;

    return this.send({
      to,
      subject,
      html,
      text: plainText,
    });
  }

  /**
   * Send a general purpose email with optional CTA button
   * Uses premium templates for consistent branding across all channels (chat, agents, etc.)
   */
  async sendGeneralEmail(params: GeneralEmailParams): Promise<{ success: boolean; error?: string; messageId?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Email service not configured' };
    }

    const { to, subject, body, preheader, ctaText, ctaUrl, skipSignature } = params;

    // Auto-detect if body already contains a signature (from AI-generated emails)
    const bodyLower = body.toLowerCase();
    const hasSignature = skipSignature || 
      bodyLower.includes('best regards') || 
      bodyLower.includes('kind regards') || 
      bodyLower.includes('sincerely') ||
      bodyLower.includes('thanks,') ||
      bodyLower.includes('thank you,');

    // Normalize whitespace: trim and collapse multiple newlines to max 2
    const normalizedBody = body.trim().replace(/\n{3,}/g, '\n\n');

    // Build content using premium template components
    let content = '';
    content += generateBodyText(normalizedBody.replace(/\n/g, '<br>'));

    if (ctaText && ctaUrl) {
      content += generatePremiumButton(ctaText, ctaUrl, 'primary');
    }

    // Only add default signature if body doesn't already have one
    if (!hasSignature) {
      content += generateBodyText('Best regards,<br><strong>IRIS Sales CRM</strong>', { muted: true });
    }

    // Use premium template for consistent branding
    const html = generatePremiumTemplate({
      preheader: preheader || subject,
      content,
    });

    // Only add signature to plain text if not already present
    const plainText = hasSignature ? normalizedBody : `${normalizedBody}\n\nBest regards,\nIRIS Sales CRM`;

    try {
      const gmailUser = this.getGmailUser();
      const toAddresses = Array.isArray(to) ? to.join(', ') : to;

      const info = await this.transporter!.sendMail({
        from: `"IRIS Sales CRM" <${gmailUser}>`,
        to: toAddresses,
        subject,
        text: plainText,
        html,
      });

      this.logger.log(`General email sent to: ${toAddresses}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send general email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a pre-formatted email (uses premium templates directly)
   * Use this for emails generated from premium-email-templates.ts
   */
  async sendPremiumEmail(params: {
    to: string | string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.isReady()) {
      this.logger.warn('Email service not configured - skipping premium email');
      return { success: false, error: 'Email service not configured' };
    }

    return this.send(params);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Low-level send method
   */
  private async send(params: {
    to: string | string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const gmailUser = this.getGmailUser();
      const toAddresses = Array.isArray(params.to) ? params.to.join(', ') : params.to;

      await this.transporter!.sendMail({
        from: `"IRIS Sales CRM" <${gmailUser}>`,
        to: toAddresses,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });

      this.logger.log(`Email sent to: ${toAddresses}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate ICS calendar event content
   */
  private generateICS(params: {
    title: string;
    startDate: Date;
    duration: number;
    joinUrl: string;
    description?: string;
    organizerName?: string;
    organizerEmail?: string;
    attendees: string[];
  }): string {
    const { title, startDate, duration, joinUrl, description, organizerName, organizerEmail, attendees } = params;
    
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@iris-crm.com`;
    const now = new Date();

    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const escapeICS = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const attendeeLines = attendees
      .map(email => `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${email}:mailto:${email}`)
      .join('\r\n');

    const descriptionText = description 
      ? `${escapeICS(description)}\\n\\nJoin URL: ${joinUrl}` 
      : `Join URL: ${joinUrl}`;

    const organizerLine = organizerEmail
      ? `ORGANIZER;CN=${escapeICS(organizerName || organizerEmail)}:mailto:${organizerEmail}`
      : '';

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//IRIS Sales CRM//Meeting Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'X-WR-TIMEZONE:UTC',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${descriptionText}`,
      `LOCATION:${joinUrl}`,
      `URL:${joinUrl}`,
      organizerLine,
      attendeeLines,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'SEQUENCE:0',
      'PRIORITY:5',
      'CLASS:PUBLIC',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Meeting starts in 15 minutes',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT5M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Meeting starts in 5 minutes',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(line => line !== '').join('\r\n');

    return icsLines;
  }
}
