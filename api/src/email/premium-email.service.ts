import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProviderFactory } from './providers/email-provider.factory';
import { EmailSendResult } from './providers/email-provider.interface';

// Import all premium templates
import {
  // Premium templates
  generateWelcomeEmail,
  generatePasswordResetEmail,
  generateForgotPasswordEmail,
  generateMagicLinkEmail,
  generateLoginNotificationEmail,
  generateDealWonEmail,
  generateNewLeadAssignedEmail,
  generateDailyDigestEmail,
  generateWaitlistConfirmationEmail,
  generateCSATFeedbackEmail,
  // Params types
  WelcomeEmailParams,
  PasswordResetEmailParams,
  ForgotPasswordEmailParams,
  MagicLinkEmailParams,
  LoginNotificationEmailParams,
  DealWonEmailParams,
  NewLeadAssignedEmailParams,
  DailyDigestEmailParams,
  WaitlistConfirmationEmailParams,
  CSATFeedbackEmailParams,
} from './templates/premium-email-templates';

import {
  // CRM templates
  generateTaskReminderEmail,
  generateTaskOverdueEmail,
  generateMeetingReminderEmail,
  generateMeetingInviteEmail,
  generateActivitySummaryEmail,
  generateDealStageChangeEmail,
  generateAccountVerificationEmail,
  generateNewUserSignupEmail,
  // Params types
  TaskReminderEmailParams,
  TaskOverdueEmailParams,
  MeetingReminderEmailParams,
  MeetingInviteEmailParams,
  ActivitySummaryEmailParams,
  DealStageChangeEmailParams,
  AccountVerificationEmailParams,
  NewUserSignupEmailParams,
} from './templates/crm-email-templates';

/**
 * Premium Email Service
 *
 * High-level service for sending beautifully branded IRIS emails
 * using the premium email templates and multi-provider factory
 */
@Injectable()
export class PremiumEmailService {
  private readonly logger = new Logger(PremiumEmailService.name);
  private readonly appUrl: string;

  constructor(
    private readonly emailProviderFactory: EmailProviderFactory,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL') || 'https://app.iriseller.com';
  }

  /**
   * Check if email service is ready
   */
  isReady(): boolean {
    return this.emailProviderFactory.isReady();
  }

  /**
   * Get available email providers
   */
  getAvailableProviders(): string[] {
    return this.emailProviderFactory.getAvailableProviders();
  }

  // ==================== AUTHENTICATION EMAILS ====================

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    to: string,
    params: Omit<WelcomeEmailParams, 'loginUrl'> & { loginUrl?: string }
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateWelcomeEmail({
      ...params,
      loginUrl: params.loginUrl || `${this.appUrl}/login`,
    });

    this.logger.warn(`[WELCOME EMAIL] Sending welcome email to: ${to}`);

    // Check if email provider is ready
    if (!this.emailProviderFactory.isReady()) {
      this.logger.error(`[WELCOME EMAIL] Email provider not ready - welcome email to ${to} will not be sent`);
      return { success: false, error: 'Email provider not configured' };
    }

    const result = await this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['welcome', 'onboarding'],
      metadata: { type: 'welcome', userName: params.userName },
    });

    if (!result.success) {
      this.logger.warn(`[WELCOME EMAIL] Failed to send to ${to}: ${result.error}`);
    } else {
      this.logger.warn(`[WELCOME EMAIL] Sent successfully to ${to}, messageId: ${result.messageId}`);
    }

    return result;
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetEmail(
    to: string,
    params: PasswordResetEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generatePasswordResetEmail(params);

    this.logger.warn(`[PASSWORD RESET] Sending password reset email to: ${to}`);

    if (!this.emailProviderFactory.isReady()) {
      this.logger.error(`[PASSWORD RESET] Email provider not ready - email to ${to} will not be sent`);
      return { success: false, error: 'Email provider not configured' };
    }

    const result = await this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['password-reset', 'security'],
      metadata: { type: 'password-reset', userName: params.userName },
    });

    if (!result.success) {
      this.logger.error(`[PASSWORD RESET] Failed to send to ${to}: ${result.error}`);
    } else {
      this.logger.warn(`[PASSWORD RESET] Sent successfully to ${to}, messageId: ${result.messageId}`);
    }

    return result;
  }

  /**
   * Send forgot password email with reset code
   */
  async sendForgotPasswordEmail(
    to: string,
    params: ForgotPasswordEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateForgotPasswordEmail(params);

    this.logger.warn(`[FORGOT PASSWORD] Sending forgot password email to: ${to}`);

    // Check if email provider is ready
    if (!this.emailProviderFactory.isReady()) {
      this.logger.error(`[FORGOT PASSWORD] Email provider not ready - email to ${to} will not be sent`);
      return { success: false, error: 'Email provider not configured' };
    }

    const result = await this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['forgot-password', 'security'],
      metadata: { type: 'forgot-password', userName: params.userName },
    });

    if (!result.success) {
      this.logger.error(`[FORGOT PASSWORD] Failed to send to ${to}: ${result.error}`);
    } else {
      this.logger.warn(`[FORGOT PASSWORD] Sent successfully to ${to}, messageId: ${result.messageId}`);
    }

    return result;
  }

  /**
   * Send magic link login email
   */
  async sendMagicLinkEmail(
    to: string,
    params: MagicLinkEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateMagicLinkEmail(params);

    this.logger.warn(`[MAGIC LINK] Sending magic link email to: ${to}`);

    // Check if email provider is ready
    if (!this.emailProviderFactory.isReady()) {
      this.logger.error(`[MAGIC LINK] Email provider not ready - email to ${to} will not be sent`);
      return { success: false, error: 'Email provider not configured' };
    }

    const result = await this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['magic-link', 'authentication'],
      metadata: { type: 'magic-link', userName: params.userName },
    });

    if (!result.success) {
      this.logger.error(`[MAGIC LINK] Failed to send to ${to}: ${result.error}`);
    } else {
      this.logger.warn(`[MAGIC LINK] Sent successfully to ${to}, messageId: ${result.messageId}`);
    }

    return result;
  }

  /**
   * Send login notification email
   */
  async sendLoginNotificationEmail(
    to: string,
    params: LoginNotificationEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateLoginNotificationEmail(params);

    this.logger.warn(`[LOGIN NOTIFICATION] Sending login notification to: ${to}`);

    // Check if email provider is ready
    if (!this.emailProviderFactory.isReady()) {
      this.logger.error(`[LOGIN NOTIFICATION] Email provider not ready - email to ${to} will not be sent`);
      return { success: false, error: 'Email provider not configured' };
    }

    const result = await this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['login-notification', 'security'],
      metadata: { type: 'login-notification', userName: params.userName, location: params.location || 'Unknown' },
    });

    if (!result.success) {
      this.logger.error(`[LOGIN NOTIFICATION] Failed to send to ${to}: ${result.error}`);
    } else {
      this.logger.warn(`[LOGIN NOTIFICATION] Sent successfully to ${to}, messageId: ${result.messageId}`);
    }

    return result;
  }

  /**
   * Send account verification email
   */
  async sendAccountVerificationEmail(
    to: string,
    params: AccountVerificationEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateAccountVerificationEmail(params);

    this.logger.log(`Sending verification email to: ${to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['verification', 'onboarding'],
      metadata: { type: 'verification', userName: params.userName },
    });
  }

  // ==================== DEAL & LEAD EMAILS ====================

  /**
   * Send deal won celebration email
   */
  async sendDealWonEmail(
    to: string | string[],
    params: DealWonEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateDealWonEmail(params);

    this.logger.log(`Sending deal won email to: ${Array.isArray(to) ? to.join(', ') : to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['deal-won', 'celebration', 'sales'],
      metadata: { type: 'deal-won', dealName: params.dealName, dealValue: params.dealValue },
    });
  }

  /**
   * Send new lead assigned email
   */
  async sendNewLeadAssignedEmail(
    to: string,
    params: NewLeadAssignedEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateNewLeadAssignedEmail(params);

    this.logger.log(`Sending new lead assigned email to: ${to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['lead-assigned', 'sales'],
      metadata: { type: 'lead-assigned', leadName: params.leadName },
    });
  }

  /**
   * Send deal stage change notification
   */
  async sendDealStageChangeEmail(
    to: string | string[],
    params: DealStageChangeEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateDealStageChangeEmail(params);

    this.logger.log(`Sending deal stage change email to: ${Array.isArray(to) ? to.join(', ') : to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['deal-update', 'sales'],
      metadata: { type: 'deal-stage-change', dealName: params.dealName, newStage: params.newStage },
    });
  }

  // ==================== TASK & MEETING EMAILS ====================

  /**
   * Send task reminder email
   */
  async sendTaskReminderEmail(
    to: string,
    params: TaskReminderEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateTaskReminderEmail(params);

    this.logger.log(`Sending task reminder email to: ${to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['task-reminder', 'productivity'],
      metadata: { type: 'task-reminder', taskTitle: params.taskTitle },
    });
  }

  /**
   * Send task overdue notification email
   */
  async sendTaskOverdueEmail(
    to: string,
    params: TaskOverdueEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateTaskOverdueEmail(params);

    this.logger.log(`Sending task overdue email to: ${to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['task-overdue', 'productivity'],
      metadata: { type: 'task-overdue', taskCount: String(params.tasks.length) },
    });
  }

  /**
   * Send meeting reminder email
   */
  async sendMeetingReminderEmail(
    to: string,
    params: MeetingReminderEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateMeetingReminderEmail(params);

    this.logger.log(`Sending meeting reminder email to: ${to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['meeting-reminder', 'calendar'],
      metadata: { type: 'meeting-reminder', meetingTitle: params.meetingTitle },
    });
  }

  /**
   * Send meeting invite email with calendar attachment
   */
  async sendMeetingInviteEmail(
    to: string | string[],
    params: MeetingInviteEmailParams,
    icsContent?: string
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateMeetingInviteEmail(params);
    const recipients = Array.isArray(to) ? to : [to];

    this.logger.log(`Sending meeting invite email to: ${recipients.join(', ')}`);

    // Send with optional ICS attachment
    const attachments = icsContent ? [{
      filename: 'invite.ics',
      content: icsContent,
      contentType: 'text/calendar; method=REQUEST',
    }] : undefined;

    return this.emailProviderFactory.send({
      to: recipients.join(', '),
      subject,
      html,
      text,
      tags: ['meeting-invite', 'calendar'],
      metadata: { type: 'meeting-invite', meetingTitle: params.meetingTitle },
      attachments,
    });
  }

  // ==================== DIGEST & SUMMARY EMAILS ====================

  /**
   * Send daily digest email
   */
  async sendDailyDigestEmail(
    to: string,
    params: DailyDigestEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateDailyDigestEmail(params);

    this.logger.log(`Sending daily digest email to: ${to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['daily-digest', 'summary'],
      metadata: { type: 'daily-digest', date: params.date },
    });
  }

  /**
   * Send activity summary email
   */
  async sendActivitySummaryEmail(
    to: string,
    params: ActivitySummaryEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateActivitySummaryEmail(params);

    this.logger.log(`Sending activity summary email to: ${to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['activity-summary', 'summary', params.period],
      metadata: { type: 'activity-summary', period: params.period },
    });
  }

  // ==================== ADMIN EMAILS ====================

  /**
   * Send new user signup notification to admins
   */
  async sendNewUserSignupEmail(
    to: string | string[],
    params: NewUserSignupEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateNewUserSignupEmail(params);

    this.logger.log(`Sending new user signup notification to: ${Array.isArray(to) ? to.join(', ') : to}`);

    return this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['admin', 'new-user'],
      metadata: { type: 'new-user-signup', newUserEmail: params.newUserEmail },
    });
  }

  // ==================== WAITLIST EMAILS ====================

  /**
   * Send waitlist confirmation email
   */
  async sendWaitlistConfirmationEmail(
    to: string,
    params: WaitlistConfirmationEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateWaitlistConfirmationEmail(params);

    this.logger.log(`[WAITLIST] Sending confirmation email to: ${to}`);

    // Check if email provider is ready
    if (!this.emailProviderFactory.isReady()) {
      this.logger.warn(`[WAITLIST] Email provider not ready - confirmation to ${to} will not be sent`);
      return { success: false, error: 'Email provider not configured' };
    }

    const result = await this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['waitlist', 'confirmation'],
      metadata: { type: 'waitlist-confirmation', email: to, company: params.company || 'unknown' },
    });

    if (!result.success) {
      this.logger.warn(`[WAITLIST] Failed to send to ${to}: ${result.error}`);
    } else {
      this.logger.log(`[WAITLIST] Sent successfully to ${to}, messageId: ${result.messageId}`);
    }

    return result;
  }

  // ==================== SUPPORT / CSAT EMAILS ====================

  /**
   * Send CSAT feedback request email
   */
  async sendCSATFeedbackEmail(
    to: string,
    params: CSATFeedbackEmailParams
  ): Promise<EmailSendResult> {
    const { html, text, subject } = generateCSATFeedbackEmail(params);

    this.logger.log(`[CSAT] Sending feedback request email to: ${to}`);

    // Check if email provider is ready
    if (!this.emailProviderFactory.isReady()) {
      this.logger.warn(`[CSAT] Email provider not ready - feedback request to ${to} will not be sent`);
      return { success: false, error: 'Email provider not configured' };
    }

    const result = await this.emailProviderFactory.send({
      to,
      subject,
      html,
      text,
      tags: ['csat', 'feedback', 'support'],
      metadata: { type: 'csat-feedback', caseId: params.caseId },
    });

    if (!result.success) {
      this.logger.warn(`[CSAT] Failed to send to ${to}: ${result.error}`);
    } else {
      this.logger.log(`[CSAT] Sent successfully to ${to}, messageId: ${result.messageId}`);
    }

    return result;
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Send daily digest to multiple users
   */
  async sendBatchDailyDigest(
    users: Array<{ email: string; params: DailyDigestEmailParams }>
  ): Promise<EmailSendResult[]> {
    this.logger.log(`Sending batch daily digest to ${users.length} users`);

    const emails = users.map(({ email, params }) => {
      const { html, text, subject } = generateDailyDigestEmail(params);
      return {
        to: email,
        subject,
        html,
        text,
        tags: ['daily-digest', 'summary'],
        metadata: { type: 'daily-digest', date: params.date },
      };
    });

    return this.emailProviderFactory.sendBatch(emails);
  }

  /**
   * Send activity summary to multiple users
   */
  async sendBatchActivitySummary(
    users: Array<{ email: string; params: ActivitySummaryEmailParams }>
  ): Promise<EmailSendResult[]> {
    this.logger.log(`Sending batch activity summary to ${users.length} users`);

    const emails = users.map(({ email, params }) => {
      const { html, text, subject } = generateActivitySummaryEmail(params);
      return {
        to: email,
        subject,
        html,
        text,
        tags: ['activity-summary', 'summary', params.period],
        metadata: { type: 'activity-summary', period: params.period },
      };
    });

    return this.emailProviderFactory.sendBatch(emails);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate a secure verification code
   */
  generateVerificationCode(length: number = 6): string {
    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Generate a secure reset token (URL-safe)
   */
  generateResetToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
  }
}
