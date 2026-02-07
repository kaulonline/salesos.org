import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import {
  generateSalesOSWelcomeEmail,
  generateSalesOSForgotPasswordEmail,
  generateSalesOSPasswordResetEmail,
  generateSalesOSMagicLinkEmail,
  generateSalesOSLoginNotificationEmail,
  generateSalesOSVerificationEmail,
  generateSalesOSInvitationEmail,
  generateSalesOSSetupCompleteEmail,
  generateSalesOSTrialEndingEmail,
  generateSalesOSDeactivationWarningEmail,
  // Billing
  generateSalesOSSubscriptionConfirmedEmail,
  generateSalesOSPaymentReceiptEmail,
  generateSalesOSPaymentFailedEmail,
  generateSalesOSSubscriptionCancelledEmail,
  // CRM Notifications
  generateSalesOSDealWonEmail,
  generateSalesOSDealLostEmail,
  generateSalesOSLeadAssignedEmail,
  generateSalesOSLeadConvertedEmail,
  generateSalesOSTaskReminderEmail,
  generateSalesOSTaskOverdueEmail,
  generateSalesOSMeetingReminderEmail,
  generateSalesOSFollowUpReminderEmail,
  generateSalesOSStaleDealAlertEmail,
  // Quotes & Orders
  generateSalesOSQuoteSentEmail,
  generateSalesOSQuoteAcceptedEmail,
  generateSalesOSQuoteExpiredEmail,
  generateSalesOSOrderConfirmationEmail,
  // Reports & Data
  generateSalesOSWeeklySummaryEmail,
  generateSalesOSExportCompleteEmail,
} from './templates/salesos-email-templates';

/**
 * SalesOS Email Service
 *
 * Handles all SalesOS-branded transactional emails using the
 * SalesOS design system (gold accents, warm beige backgrounds, dark CTAs)
 */
@Injectable()
export class SalesOSEmailService {
  private readonly logger = new Logger(SalesOSEmailService.name);
  private readonly appUrl = process.env.SALESOS_APP_URL || process.env.APP_URL || 'https://salesos.org';

  constructor(private readonly emailService: EmailService) {}

  /**
   * Check if email service is ready
   */
  isReady(): boolean {
    return this.emailService.isReady();
  }

  /**
   * Helper to strip HTML for plain text version
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&copy;/g, '(c)')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Send Welcome Email after registration
   */
  async sendWelcomeEmail(params: {
    to: string;
    userName?: string;
  }): Promise<boolean> {
    const { to, userName } = params;

    try {
      const html = generateSalesOSWelcomeEmail({
        userName,
        userEmail: to,
        loginUrl: `${this.appUrl}/login`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: 'Welcome to SalesOS',
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Welcome email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Forgot Password Email with reset code
   */
  async sendForgotPasswordEmail(params: {
    to: string;
    userName?: string;
    resetCode: string;
    resetToken: string;
    expirationMinutes?: number;
  }): Promise<boolean> {
    const { to, userName, resetCode, resetToken, expirationMinutes = 30 } = params;

    try {
      const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;

      const html = generateSalesOSForgotPasswordEmail({
        userName,
        resetCode,
        resetUrl,
        expirationMinutes,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `${resetCode} is your SalesOS password reset code`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Forgot password email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send forgot password email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Password Reset Confirmation Email
   */
  async sendPasswordResetEmail(params: {
    to: string;
    userName?: string;
  }): Promise<boolean> {
    const { to, userName } = params;

    try {
      const html = generateSalesOSPasswordResetEmail({
        userName,
        loginUrl: `${this.appUrl}/login`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: 'Your SalesOS password has been reset',
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Password reset confirmation sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset confirmation to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Magic Link Email for passwordless login
   */
  async sendMagicLinkEmail(params: {
    to: string;
    userName?: string;
    magicToken: string;
    expirationMinutes?: number;
  }): Promise<boolean> {
    const { to, userName, magicToken, expirationMinutes = 15 } = params;

    try {
      const magicLinkUrl = `${this.appUrl}/api/auth/magic-link?token=${magicToken}`;

      const html = generateSalesOSMagicLinkEmail({
        userName,
        magicLinkUrl,
        expirationMinutes,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: 'Sign in to SalesOS',
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Magic link email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send magic link email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Login Notification Email for security
   */
  async sendLoginNotificationEmail(params: {
    to: string;
    userName?: string;
    loginTime: string;
    ipAddress?: string;
    location?: string;
    device?: string;
    browser?: string;
  }): Promise<boolean> {
    const { to, userName, loginTime, ipAddress, location, device, browser } = params;

    try {
      const html = generateSalesOSLoginNotificationEmail({
        userName,
        loginTime,
        ipAddress,
        location,
        device,
        browser,
        securitySettingsUrl: `${this.appUrl}/dashboard/settings/security`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: 'New sign-in to your SalesOS account',
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Login notification sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send login notification to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Email Verification
   */
  async sendVerificationEmail(params: {
    to: string;
    userName?: string;
    verificationCode: string;
    verificationToken: string;
    expirationMinutes?: number;
  }): Promise<boolean> {
    const { to, userName, verificationCode, verificationToken, expirationMinutes = 60 } = params;

    try {
      const verificationUrl = `${this.appUrl}/verify-email?token=${verificationToken}`;

      const html = generateSalesOSVerificationEmail({
        userName,
        verificationCode,
        verificationUrl,
        expirationMinutes,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `${verificationCode} is your SalesOS verification code`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Verification email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Team Invitation Email
   */
  async sendInvitationEmail(params: {
    to: string;
    inviterName: string;
    organizationName: string;
    inviteToken: string;
    role?: string;
    expirationDays?: number;
  }): Promise<boolean> {
    const { to, inviterName, organizationName, inviteToken, role, expirationDays = 7 } = params;

    try {
      const inviteUrl = `${this.appUrl}/invite?token=${inviteToken}`;

      const html = generateSalesOSInvitationEmail({
        inviterName,
        organizationName,
        inviteUrl,
        role,
        expirationDays,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `${inviterName} invited you to join ${organizationName} on SalesOS`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Invitation email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Setup Complete Email
   */
  async sendSetupCompleteEmail(params: {
    to: string;
    userName: string;
    features?: string[];
  }): Promise<boolean> {
    const { to, userName, features } = params;

    try {
      const html = generateSalesOSSetupCompleteEmail({
        userName,
        dashboardUrl: `${this.appUrl}/dashboard`,
        features,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: "You're all set! Welcome to SalesOS",
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Setup complete email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send setup complete email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Trial Ending Reminder
   */
  async sendTrialEndingEmail(params: {
    to: string;
    userName: string;
    daysRemaining: number;
  }): Promise<boolean> {
    const { to, userName, daysRemaining } = params;

    try {
      const html = generateSalesOSTrialEndingEmail({
        userName,
        daysRemaining,
        upgradeUrl: `${this.appUrl}/dashboard/settings/subscription`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left on your SalesOS trial`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Trial ending email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send trial ending email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Account Deactivation Warning
   */
  async sendDeactivationWarningEmail(params: {
    to: string;
    userName: string;
    deactivationDate: string;
    reason?: string;
  }): Promise<boolean> {
    const { to, userName, deactivationDate, reason } = params;

    try {
      const html = generateSalesOSDeactivationWarningEmail({
        userName,
        deactivationDate,
        reactivateUrl: `${this.appUrl}/login`,
        reason,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: 'Action required: Your SalesOS account',
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Deactivation warning sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send deactivation warning to ${to}:`, error);
      return false;
    }
  }

  // ==================== BILLING EMAILS ====================

  /**
   * Send Subscription Confirmed Email
   */
  async sendSubscriptionConfirmedEmail(params: {
    to: string;
    userName: string;
    planName: string;
    amount: string;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: string;
    features?: string[];
  }): Promise<boolean> {
    const { to, userName, planName, amount, billingCycle, nextBillingDate, features } = params;

    try {
      const html = generateSalesOSSubscriptionConfirmedEmail({
        userName,
        planName,
        amount,
        billingCycle,
        nextBillingDate,
        dashboardUrl: `${this.appUrl}/dashboard`,
        features,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Welcome to ${planName} - SalesOS`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Subscription confirmed email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send subscription confirmed email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Payment Receipt Email
   */
  async sendPaymentReceiptEmail(params: {
    to: string;
    userName: string;
    invoiceNumber: string;
    amount: string;
    description: string;
    paymentDate: string;
    paymentMethod: string;
    invoiceUrl?: string;
  }): Promise<boolean> {
    const { to, userName, invoiceNumber, amount, description, paymentDate, paymentMethod, invoiceUrl } = params;

    try {
      const html = generateSalesOSPaymentReceiptEmail({
        userName,
        invoiceNumber,
        amount,
        description,
        paymentDate,
        paymentMethod,
        invoiceUrl,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Payment Receipt - ${invoiceNumber}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Payment receipt sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send payment receipt to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Payment Failed Email
   */
  async sendPaymentFailedEmail(params: {
    to: string;
    userName: string;
    amount: string;
    failureReason?: string;
    retryDate?: string;
  }): Promise<boolean> {
    const { to, userName, amount, failureReason, retryDate } = params;

    try {
      const html = generateSalesOSPaymentFailedEmail({
        userName,
        amount,
        failureReason,
        retryDate,
        updatePaymentUrl: `${this.appUrl}/dashboard/settings/billing`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: 'Action Required: Payment Failed - SalesOS',
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Payment failed email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send payment failed email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Subscription Cancelled Email
   */
  async sendSubscriptionCancelledEmail(params: {
    to: string;
    userName: string;
    planName: string;
    accessUntil: string;
    reason?: string;
  }): Promise<boolean> {
    const { to, userName, planName, accessUntil, reason } = params;

    try {
      const html = generateSalesOSSubscriptionCancelledEmail({
        userName,
        planName,
        accessUntil,
        resubscribeUrl: `${this.appUrl}/dashboard/settings/subscription`,
        reason,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: 'Subscription Cancelled - SalesOS',
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Subscription cancelled email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send subscription cancelled email to ${to}:`, error);
      return false;
    }
  }

  // ==================== CRM NOTIFICATION EMAILS ====================

  /**
   * Send Deal Won Email
   */
  async sendDealWonEmail(params: {
    to: string;
    userName: string;
    dealName: string;
    dealValue: string;
    contactName: string;
    companyName?: string;
    closedDate: string;
    dealId: string;
  }): Promise<boolean> {
    const { to, userName, dealName, dealValue, contactName, companyName, closedDate, dealId } = params;

    try {
      const html = generateSalesOSDealWonEmail({
        userName,
        dealName,
        dealValue,
        contactName,
        companyName,
        closedDate,
        dashboardUrl: `${this.appUrl}/dashboard/deals/${dealId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `🎉 Deal Won: ${dealName} - ${dealValue}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Deal won email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send deal won email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Deal Lost Email
   */
  async sendDealLostEmail(params: {
    to: string;
    userName: string;
    dealName: string;
    dealValue: string;
    contactName: string;
    companyName?: string;
    lostReason?: string;
    dealId: string;
  }): Promise<boolean> {
    const { to, userName, dealName, dealValue, contactName, companyName, lostReason, dealId } = params;

    try {
      const html = generateSalesOSDealLostEmail({
        userName,
        dealName,
        dealValue,
        contactName,
        companyName,
        lostReason,
        dashboardUrl: `${this.appUrl}/dashboard/deals/${dealId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Deal Lost: ${dealName}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Deal lost email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send deal lost email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Lead Assigned Email
   */
  async sendLeadAssignedEmail(params: {
    to: string;
    userName: string;
    leadName: string;
    leadEmail?: string;
    leadCompany?: string;
    leadSource?: string;
    assignedBy?: string;
    leadId: string;
  }): Promise<boolean> {
    const { to, userName, leadName, leadEmail, leadCompany, leadSource, assignedBy, leadId } = params;

    try {
      const html = generateSalesOSLeadAssignedEmail({
        userName,
        leadName,
        leadEmail,
        leadCompany,
        leadSource,
        assignedBy,
        leadUrl: `${this.appUrl}/dashboard/leads/${leadId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `New Lead Assigned: ${leadName}${leadCompany ? ` from ${leadCompany}` : ''}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Lead assigned email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send lead assigned email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Task Reminder Email
   */
  async sendTaskReminderEmail(params: {
    to: string;
    userName: string;
    taskTitle: string;
    taskDescription?: string;
    dueDate: string;
    dueTime?: string;
    relatedTo?: { type: string; name: string };
    taskId: string;
  }): Promise<boolean> {
    const { to, userName, taskTitle, taskDescription, dueDate, dueTime, relatedTo, taskId } = params;

    try {
      const html = generateSalesOSTaskReminderEmail({
        userName,
        taskTitle,
        taskDescription,
        dueDate,
        dueTime,
        relatedTo,
        taskUrl: `${this.appUrl}/dashboard/tasks/${taskId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Task Reminder: ${taskTitle}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Task reminder sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send task reminder to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Task Overdue Email
   */
  async sendTaskOverdueEmail(params: {
    to: string;
    userName: string;
    taskTitle: string;
    taskDescription?: string;
    dueDate: string;
    daysOverdue: number;
    relatedTo?: { type: string; name: string };
    taskId: string;
  }): Promise<boolean> {
    const { to, userName, taskTitle, taskDescription, dueDate, daysOverdue, relatedTo, taskId } = params;

    try {
      const html = generateSalesOSTaskOverdueEmail({
        userName,
        taskTitle,
        taskDescription,
        dueDate,
        daysOverdue,
        relatedTo,
        taskUrl: `${this.appUrl}/dashboard/tasks/${taskId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `⚠️ Overdue: ${taskTitle}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Task overdue email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send task overdue email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Meeting Reminder Email
   */
  async sendMeetingReminderEmail(params: {
    to: string;
    userName: string;
    meetingTitle: string;
    meetingDate: string;
    meetingTime: string;
    duration?: string;
    attendees?: string[];
    location?: string;
    meetingUrl?: string;
  }): Promise<boolean> {
    const { to, userName, meetingTitle, meetingDate, meetingTime, duration, attendees, location, meetingUrl } = params;

    try {
      const html = generateSalesOSMeetingReminderEmail({
        userName,
        meetingTitle,
        meetingDate,
        meetingTime,
        duration,
        attendees,
        location,
        meetingUrl,
        calendarUrl: `${this.appUrl}/dashboard/calendar`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Meeting Reminder: ${meetingTitle} - ${meetingDate}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Meeting reminder sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send meeting reminder to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Lead Converted Email
   */
  async sendLeadConvertedEmail(params: {
    to: string;
    userName: string;
    leadName: string;
    leadCompany?: string;
    dealName: string;
    dealValue?: string;
    dealStage: string;
    convertedBy?: string;
    dealId: string;
  }): Promise<boolean> {
    const { to, userName, leadName, leadCompany, dealName, dealValue, dealStage, convertedBy, dealId } = params;

    try {
      const html = generateSalesOSLeadConvertedEmail({
        userName,
        leadName,
        leadCompany,
        dealName,
        dealValue,
        dealStage,
        convertedBy,
        dealUrl: `${this.appUrl}/dashboard/deals/${dealId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `🚀 Lead Converted: ${leadName} → ${dealName}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Lead converted email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send lead converted email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Follow-up Reminder Email
   */
  async sendFollowUpReminderEmail(params: {
    to: string;
    userName: string;
    contactName: string;
    contactEmail?: string;
    contactCompany?: string;
    lastActivityType?: string;
    lastActivityDate?: string;
    daysSinceContact: number;
    suggestedAction?: string;
    contactId: string;
  }): Promise<boolean> {
    const { to, userName, contactName, contactEmail, contactCompany, lastActivityType, lastActivityDate, daysSinceContact, suggestedAction, contactId } = params;

    try {
      const html = generateSalesOSFollowUpReminderEmail({
        userName,
        contactName,
        contactEmail,
        contactCompany,
        lastActivityType,
        lastActivityDate,
        daysSinceContact,
        suggestedAction,
        contactUrl: `${this.appUrl}/dashboard/contacts/${contactId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Follow-up Reminder: ${contactName}${contactCompany ? ` (${contactCompany})` : ''}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Follow-up reminder sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send follow-up reminder to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Stale Deal Alert Email
   */
  async sendStaleDealAlertEmail(params: {
    to: string;
    userName: string;
    dealName: string;
    dealValue: string;
    currentStage: string;
    daysInStage: number;
    contactName?: string;
    companyName?: string;
    lastActivityDate?: string;
    suggestedActions?: string[];
    dealId: string;
  }): Promise<boolean> {
    const { to, userName, dealName, dealValue, currentStage, daysInStage, contactName, companyName, lastActivityDate, suggestedActions, dealId } = params;

    try {
      const urgencyIcon = daysInStage > 30 ? '🚨' : daysInStage > 14 ? '⚠️' : '📊';

      const html = generateSalesOSStaleDealAlertEmail({
        userName,
        dealName,
        dealValue,
        currentStage,
        daysInStage,
        contactName,
        companyName,
        lastActivityDate,
        suggestedActions,
        dealUrl: `${this.appUrl}/dashboard/deals/${dealId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `${urgencyIcon} Stale Deal: ${dealName} - ${daysInStage} days in ${currentStage}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Stale deal alert sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send stale deal alert to ${to}:`, error);
      return false;
    }
  }

  // ==================== QUOTE & ORDER EMAILS ====================

  /**
   * Send Quote Sent Email
   */
  async sendQuoteSentEmail(params: {
    to: string;
    userName: string;
    quoteName: string;
    quoteNumber: string;
    quoteAmount: string;
    recipientName: string;
    recipientEmail: string;
    validUntil: string;
    quoteId: string;
  }): Promise<boolean> {
    const { to, userName, quoteName, quoteNumber, quoteAmount, recipientName, recipientEmail, validUntil, quoteId } = params;

    try {
      const html = generateSalesOSQuoteSentEmail({
        userName,
        quoteName,
        quoteNumber,
        quoteAmount,
        recipientName,
        recipientEmail,
        validUntil,
        quoteUrl: `${this.appUrl}/dashboard/quotes/${quoteId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Quote Sent: ${quoteName} - ${quoteAmount}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Quote sent email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send quote sent email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Quote Accepted Email
   */
  async sendQuoteAcceptedEmail(params: {
    to: string;
    userName: string;
    quoteName: string;
    quoteNumber: string;
    quoteAmount: string;
    acceptedBy: string;
    acceptedDate: string;
    quoteId: string;
  }): Promise<boolean> {
    const { to, userName, quoteName, quoteNumber, quoteAmount, acceptedBy, acceptedDate, quoteId } = params;

    try {
      const html = generateSalesOSQuoteAcceptedEmail({
        userName,
        quoteName,
        quoteNumber,
        quoteAmount,
        acceptedBy,
        acceptedDate,
        quoteUrl: `${this.appUrl}/dashboard/quotes/${quoteId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `🎉 Quote Accepted: ${quoteName} - ${quoteAmount}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Quote accepted email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send quote accepted email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Quote Expired Email
   */
  async sendQuoteExpiredEmail(params: {
    to: string;
    userName: string;
    quoteName: string;
    quoteNumber: string;
    quoteAmount: string;
    recipientName: string;
    expiredDate: string;
    quoteId: string;
  }): Promise<boolean> {
    const { to, userName, quoteName, quoteNumber, quoteAmount, recipientName, expiredDate, quoteId } = params;

    try {
      const html = generateSalesOSQuoteExpiredEmail({
        userName,
        quoteName,
        quoteNumber,
        quoteAmount,
        recipientName,
        expiredDate,
        quoteUrl: `${this.appUrl}/dashboard/quotes/${quoteId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Quote Expired: ${quoteName}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Quote expired email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send quote expired email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Order Confirmation Email
   */
  async sendOrderConfirmationEmail(params: {
    to: string;
    userName: string;
    orderNumber: string;
    orderTotal: string;
    customerName: string;
    customerEmail: string;
    orderDate: string;
    items: { name: string; quantity: number; price: string }[];
    orderId: string;
  }): Promise<boolean> {
    const { to, userName, orderNumber, orderTotal, customerName, customerEmail, orderDate, items, orderId } = params;

    try {
      const html = generateSalesOSOrderConfirmationEmail({
        userName,
        orderNumber,
        orderTotal,
        customerName,
        customerEmail,
        orderDate,
        items,
        orderUrl: `${this.appUrl}/dashboard/orders/${orderId}`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Order Confirmed: ${orderNumber} - ${orderTotal}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Order confirmation sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send order confirmation to ${to}:`, error);
      return false;
    }
  }

  // ==================== REPORT EMAILS ====================

  /**
   * Send Weekly Summary Email
   */
  async sendWeeklySummaryEmail(params: {
    to: string;
    userName: string;
    weekOf: string;
    metrics: {
      dealsWon: number;
      dealsWonValue: string;
      newLeads: number;
      meetingsHeld: number;
      tasksCompleted: number;
      conversionRate?: string;
    };
    topDeals?: { name: string; value: string }[];
  }): Promise<boolean> {
    const { to, userName, weekOf, metrics, topDeals } = params;

    try {
      const html = generateSalesOSWeeklySummaryEmail({
        userName,
        weekOf,
        metrics,
        topDeals,
        dashboardUrl: `${this.appUrl}/dashboard/analytics`,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Your Weekly Sales Summary - ${weekOf}`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Weekly summary sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send weekly summary to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send Export Complete Email
   */
  async sendExportCompleteEmail(params: {
    to: string;
    userName: string;
    exportType: string;
    recordCount: number;
    fileSize: string;
    downloadUrl: string;
    expiresIn?: string;
  }): Promise<boolean> {
    const { to, userName, exportType, recordCount, fileSize, downloadUrl, expiresIn } = params;

    try {
      const html = generateSalesOSExportCompleteEmail({
        userName,
        exportType,
        recordCount,
        fileSize,
        downloadUrl,
        expiresIn,
      });

      await this.emailService.sendPremiumEmail({
        to,
        subject: `Your ${exportType} Export is Ready`,
        html,
        text: this.htmlToText(html),
      });

      this.logger.log(`Export complete email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send export complete email to ${to}:`, error);
      return false;
    }
  }

  // ==================== HELPERS ====================

  /**
   * Helper: Generate 6-digit verification code
   */
  generateVerificationCode(length: number = 6): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  }

  /**
   * Helper: Generate secure reset token
   */
  generateResetToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
